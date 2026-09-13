import json
import yaml
import base64
import asyncio
from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import s3, templates
from dataclasses import dataclass
from src.environments import env
from importlib.resources import files
from kr8s.asyncio.objects import Secret, APIObject, ConfigMap, Namespace, Deployment, CustomResourceDefinition, new_class, object_from_spec
from src.kubernetes.utils import apply, deployment_is_ready, wait_crd_established

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes
    from src.database.models.computes import ComputeRegistry

User = new_class("CephObjectStoreUser", "ceph.rook.io/v1", asyncio=True, plural="cephobjectstoreusers")
Store = new_class("CephObjectStore", "ceph.rook.io/v1", asyncio=True, plural="cephobjectstores")
Cluster = new_class("CephCluster", "ceph.rook.io/v1", asyncio=True, plural="cephclusters")
BucketClaim = new_class("ObjectBucketClaim", "objectbucket.io/v1alpha1", asyncio=True, plural="objectbucketclaims")
ObjectBucket = new_class("ObjectBucket", "objectbucket.io/v1alpha1", asyncio=True, namespaced=False, plural="objectbuckets")
StorageClass = new_class("StorageClass", "storage.k8s.io/v1", asyncio=True, namespaced=False, plural="storageclasses")
ROOK_VERSION = "v1.19.11"


@dataclass(frozen=True)
class Bucket:
    """Describe one reconciled bucket and its control-plane connection."""

    name: str
    storage: s3.S3


class Storage:
    """Manage shared Rook/Ceph infrastructure and organization storage resources."""

    def __init__(self, client: "Kubernetes") -> None:
        """Share the authenticated compute connection."""

        self._client = client

    async def install(self, compute: "ComputeRegistry") -> None:
        """Install pinned Rook resources and converge a PVC-backed Ceph object store."""

        # Establish upstream types before applying LongLink's storage topology.
        api = await self._client.api()
        root = files("src.kubernetes.templates").joinpath("platform")
        async with asyncio.timeout(30 * 60):
            for filename in ("crds", "common", "operator"):
                for document in yaml.safe_load_all(root.joinpath(f"rook-{filename}-{ROOK_VERSION}.yml").read_text()):
                    if not document:
                        continue
                    # RGW consumes the backing provisioner; it does not require Ceph CSI drivers or their operator.
                    if document["kind"] == "ConfigMap" and document["metadata"]["name"] == "rook-ceph-operator-config":
                        document["data"].update(
                            {
                                "ROOK_USE_CSI_OPERATOR": "false",
                                "ROOK_CSI_DISABLE_DRIVER": "true",
                                "ROOK_CSI_ENABLE_RBD": "false",
                                "ROOK_CSI_ENABLE_CEPHFS": "false",
                                "ROOK_CEPH_ALLOW_LOOP_DEVICES": "true" if env.DEVELOPMENT else "false",
                                "ROOK_OBC_ALLOW_ADDITIONAL_CONFIG_FIELDS": "bucketMaxSize,bucketMaxObjects",
                            }
                        )
                    resource = object_from_spec(document, api=api)
                    await apply(resource)
                    if isinstance(resource, CustomResourceDefinition):
                        await wait_crd_established(resource)
            operator = Deployment("rook-ceph-operator", namespace="rook-ceph", api=api)
            while True:
                await operator.refresh()
                if deployment_is_ready(operator):
                    break
                await asyncio.sleep(5)

            # The operator-owned TLS Secret must cover the registered endpoint and RGW service DNS.
            certificate = Secret("longlink-storage-tls", namespace="rook-ceph", api=api)
            await certificate.refresh()
            if not certificate.raw.get("data", {}).get("tls.crt") or not certificate.raw.get("data", {}).get("tls.key"):
                raise ValueError("rook-ceph/longlink-storage-tls requires tls.crt and tls.key")
            documents = templates.readyml_list(
                root.joinpath("storage.yml"),
                storage_class=json.dumps(compute.storage_class),
                size_gib=compute.storage_size_gib,
                instances=compute.storage_instances,
                managers=min(compute.storage_instances, 2),
                safe_replica_size="true" if compute.storage_instances > 1 else "false",
            )
            for document in documents:
                resource = object_from_spec(document, api=api)
                await apply(resource)
            store = Store("longlink", namespace="rook-ceph", api=api)
            while True:
                await store.refresh()
                status = store.raw.get("status", {})
                if status.get("phase") == "Ready" and status.get("observedGeneration") == store.metadata.get("generation"):
                    break
                await asyncio.sleep(5)

            # A bucketless read-only identity verifies the registered S3 endpoint before publication.
            probe = User(
                {
                    "metadata": {"name": "longlink-health", "namespace": "rook-ceph"},
                    "spec": {"store": "longlink", "quotas": {"maxBuckets": -1}, "opMask": ["read"]},
                },
                api=api,
            )
            await apply(probe)
            credentials = await self._credentials(probe)
            storage = await self.connection(compute, credentials)
            async with storage.client() as client:
                await client.list_buckets()

    async def apply(self, organization: UUID, compute: "ComputeRegistry") -> Bucket:
        """Provision the organization namespace and bucket claim before resolving owner credentials."""

        # Only explicit lifecycle creation may mutate the storage boundary.
        api = await self._client.api()
        namespace = f"longlink-storage-{organization.hex}"
        resource = Namespace({"metadata": {"name": namespace, "labels": {"longlink.io/namespace": "storage"}}}, api=api)
        await apply(resource)
        claim = BucketClaim(
            {
                "metadata": {"name": "storage", "namespace": namespace},
                "spec": {
                    "generateBucketName": f"longlink-{organization.hex}",
                    "storageClassName": "longlink-buckets",
                    "additionalConfig": {
                        "bucketMaxSize": str(compute.bucket_size_bytes),
                        "bucketMaxObjects": str(compute.bucket_max_objects),
                    },
                },
            },
            api=api,
        )
        await apply(claim)
        await self.quota(organization, compute)
        return await self.bucket(organization, compute)

    async def quota(self, organization: UUID, compute: "ComputeRegistry") -> None:
        """Reconcile an existing claim and wait for Rook to acknowledge the requested bucket quotas."""

        # Patch only an existing boundary; deployment must never recreate deleted organization storage.
        api = await self._client.api()
        claim = BucketClaim("storage", namespace=f"longlink-storage-{organization.hex}", api=api)
        desired = {"bucketMaxSize": str(compute.bucket_size_bytes), "bucketMaxObjects": str(compute.bucket_max_objects)}
        await claim.patch({"spec": {"additionalConfig": desired}})

        # Bound remains set during updates. Rook publishes the OB endpoint config only after SetIndividualBucketQuota succeeds.
        async with asyncio.timeout(300):
            while True:
                await claim.refresh()
                name = claim.raw.get("spec", {}).get("objectBucketName")
                if claim.raw.get("status", {}).get("phase") == "Bound" and name:
                    bucket = ObjectBucket(name, api=api)
                    await bucket.refresh()
                    spec = bucket.raw.get("spec", {})
                    configured = spec.get("endpoint", {}).get("additionalConfig", {})
                    if spec.get("claimRef", {}).get("uid") == claim.metadata.get("uid") and all(
                        configured.get(key) == value for key, value in desired.items()
                    ):
                        return
                await asyncio.sleep(2)

    async def bucket(self, organization: UUID, compute: "ComputeRegistry") -> Bucket:
        """Resolve an existing bucket and its owner credentials without provisioning resources."""

        # Read-only callers wait for binding but cannot create a missing namespace or claim.
        api = await self._client.api()
        namespace = f"longlink-storage-{organization.hex}"
        claim = BucketClaim("storage", namespace=namespace, api=api)
        async with asyncio.timeout(300):
            while True:
                await claim.refresh()
                if claim.raw.get("status", {}).get("phase") == "Bound":
                    break
                await asyncio.sleep(2)
        secret = Secret("storage", namespace=namespace, api=api)
        config = ConfigMap("storage", namespace=namespace, api=api)
        await secret.refresh()
        await config.refresh()
        credentials = s3.Credentials(
            base64.b64decode(secret.raw["data"]["AWS_ACCESS_KEY_ID"], validate=True).decode(),
            base64.b64decode(secret.raw["data"]["AWS_SECRET_ACCESS_KEY"], validate=True).decode(),
        )
        storage = await self.connection(compute, credentials)
        return Bucket(config.raw["data"]["BUCKET_NAME"], storage)

    async def connection(self, compute: "ComputeRegistry", credentials: s3.Credentials) -> s3.S3:
        """Resolve the S3 transport while retaining the registered TLS and signing identity."""

        # Only development changes the transport destination; TLS and signing retain the endpoint.
        resolver = None
        if env.DEVELOPMENT:
            from src.development import storage

            port = await self._client.portforward("rook-ceph-rgw-longlink", "rook-ceph", 443)
            resolver = storage.Resolver(compute.storage_endpoint, port)
        return s3.S3(compute.storage_endpoint, credentials, compute.storage_certificate, resolver=resolver)

    async def user(self, solution: UUID, organization: UUID) -> s3.Credentials:
        """Converge a stable unprivileged RGW user that cannot create buckets."""

        # Rook user names are RGW UIDs; UUID-based names remain unique across organization namespaces.
        api = await self._client.api()
        resource = User(
            {
                "metadata": {
                    "name": f"solution-{solution.hex}",
                    "namespace": "rook-ceph",
                    "labels": {"longlink.io/organization": organization.hex},
                },
                "spec": {
                    "store": "longlink",
                    "displayName": f"Solution {solution}",
                    "quotas": {"maxBuckets": -1},
                    "capabilities": {},
                    "opMask": ["read", "write", "delete"],
                },
            },
            api=api,
        )
        await apply(resource)
        return await self._credentials(resource)

    async def _credentials(self, resource: APIObject) -> s3.Credentials:
        """Wait for Rook to reconcile an identity before reading its generated key Secret."""

        # Observed generation prevents consuming stale keys after an identity specification changes.
        async with asyncio.timeout(300):
            while True:
                await resource.refresh()
                status = resource.raw.get("status", {})
                if status.get("phase") == "Ready" and status.get("observedGeneration") == resource.metadata.get("generation"):
                    break
                await asyncio.sleep(2)
        secret = Secret(status["info"]["secretName"], namespace="rook-ceph", api=await self._client.api())
        await secret.refresh()
        return s3.Credentials(
            base64.b64decode(secret.raw["data"]["AccessKey"], validate=True).decode(),
            base64.b64decode(secret.raw["data"]["SecretKey"], validate=True).decode(),
        )

    async def revoke(self, solution: UUID) -> None:
        """Wait for Rook to delete the RGW identity and its keys."""

        resource = User(f"solution-{solution.hex}", namespace="rook-ceph", api=await self._client.api())
        try:
            await resource.delete()
        except NotFoundError:
            return
        async with asyncio.timeout(300):
            await resource.wait("delete")

    async def delete(self, organization: UUID, compute: "ComputeRegistry") -> None:
        """Revoke users and empty the bucket before releasing its Delete-policy claim."""

        # User finalizers must complete while the shared object store still exists.
        api = await self._client.api()
        async for user in User.list(api=api, namespace="rook-ceph", label_selector={"longlink.io/organization": organization.hex}):
            await user.delete()
            async with asyncio.timeout(300):
                await user.wait("delete")
        namespace = Namespace(f"longlink-storage-{organization.hex}", api=api)
        if not await namespace.exists():
            return
        # A claim that never bound has no admitted runtime data and must still be releasable.
        claim = BucketClaim("storage", namespace=namespace.name, api=api)
        try:
            await claim.refresh()
        except NotFoundError:
            pass
        else:
            if claim.raw.get("status", {}).get("phase") == "Bound":
                bucket = await self.bucket(organization, compute)
                await bucket.storage.delete_prefix(bucket.name, "")
        await namespace.delete()
        async with asyncio.timeout(300):
            await namespace.wait("delete")

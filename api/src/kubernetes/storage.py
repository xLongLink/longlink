import base64
import asyncio
from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import s3
from dataclasses import dataclass
from kr8s.asyncio.objects import Secret, APIObject, ConfigMap, Namespace, new_class
from src.kubernetes.utils import apply

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes
    from src.database.models.computes import ComputeRegistry

User = new_class("CephObjectStoreUser", "ceph.rook.io/v1", asyncio=True, plural="cephobjectstoreusers")
Store = new_class("CephObjectStore", "ceph.rook.io/v1", asyncio=True, plural="cephobjectstores")
Cluster = new_class("CephCluster", "ceph.rook.io/v1", asyncio=True, plural="cephclusters")
BucketClaim = new_class("ObjectBucketClaim", "objectbucket.io/v1alpha1", asyncio=True, plural="objectbucketclaims")
ObjectBucket = new_class("ObjectBucket", "objectbucket.io/v1alpha1", asyncio=True, namespaced=False, plural="objectbuckets")


@dataclass(frozen=True)
class Bucket:
    """Describe one reconciled bucket and its control-plane connection."""

    name: str
    storage: s3.S3


class Storage:
    """Validate shared storage, reconcile Organization buckets, and manage Solution identities.

    The Compute package owns the shared ``longlink`` object store and its health
    identity. Each Organization receives a storage Namespace containing an
    ``ObjectBucketClaim`` named ``storage``; Rook creates the bucket and keeps its
    owner credentials in that Namespace. Each Solution receives an unprivileged
    ``CephObjectStoreUser`` in ``rook-ceph``. Callers apply the corresponding bucket
    policy and publish only the Solution credentials. Quota changes wait for Rook's
    ``ObjectBucket`` acknowledgement, rather than treating a bound claim as current.

        Structure::

        Compute
        ├── rook-ceph
        │   ├── CephObjectStore longlink
        │   └── CephObjectStoreUser solution-{solution UUID hex}
        └── Organization
            └── Namespace longlink-storage-{organization UUID hex}
                └── ObjectBucketClaim storage
    """

    def __init__(self, client: "Kubernetes") -> None:
        """Share the authenticated compute connection."""

        self._client = client

    async def verify(self, compute: "ComputeRegistry") -> None:
        """Verify installed topology and S3 access without changing shared resources."""

        # Admission capacity must match the installed topology, not an unfulfilled provisioning request.
        api = await self._client.api()
        async with asyncio.timeout(300):
            cluster = Cluster("rook-ceph", namespace="rook-ceph", api=api)
            await cluster.refresh()
            devices = cluster.raw.get("spec", {}).get("storage", {}).get("storageClassDeviceSets", [])
            if len(devices) != 1:
                raise ValueError("Compute requires one supported Ceph device set")
            device = devices[0]
            volumes = device.get("volumeClaimTemplates", [])
            if len(volumes) != 1:
                raise ValueError("Compute requires one Ceph data volume template")
            volume = volumes[0].get("spec", {})
            if (
                device.get("count") != compute.storage_instances
                or volume.get("storageClassName") != compute.storage_class
                or volume.get("resources", {}).get("requests", {}).get("storage") != f"{compute.storage_size_gib}Gi"
            ):
                raise ValueError("Registered storage capacity must match the installed Compute topology")
            store = Store("longlink", namespace="rook-ceph", api=api)
            while True:
                await cluster.refresh()
                await store.refresh()
                status = store.raw.get("status", {})
                cluster_status = cluster.raw.get("status", {})
                if (
                    status.get("phase") == "Ready"
                    and status.get("observedGeneration") == store.metadata.get("generation")
                    and cluster_status.get("phase") == "Ready"
                    and cluster_status.get("observedGeneration") == cluster.metadata.get("generation")
                ):
                    break
                await asyncio.sleep(5)

            # Capacity accounting assumes one replica per configured OSD for both object pools.
            for pool in ("dataPool", "metadataPool"):
                if store.raw.get("spec", {}).get(pool, {}).get("replicated", {}).get("size") != compute.storage_instances:
                    raise ValueError("Installed Ceph replication does not match registered usable capacity")

            # The deployment package owns this bucketless read-only probe identity.
            probe = User("longlink-health", namespace="rook-ceph", api=api)
            credentials = await self._credentials(probe)
            storage = s3.S3(
                compute.storage_endpoint,
                credentials,
                compute.storage_certificate,
            )
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
        storage = s3.S3(
            compute.storage_endpoint,
            credentials,
            compute.storage_certificate,
        )
        return Bucket(config.raw["data"]["BUCKET_NAME"], storage)

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

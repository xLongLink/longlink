import ssl
import json
import base64
import asyncio
from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from importlib.resources import files
from kr8s.asyncio.objects import Job, Pod, Secret, Namespace, new_class, object_from_spec
from src.kubernetes.utils import apply

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

ClusterResource = new_class("Cluster", "postgresql.cnpg.io/v1", asyncio=True, plural="clusters")
BackupResource = new_class("Backup", "postgresql.cnpg.io/v1", asyncio=True, plural="backups")
ScheduledBackupResource = new_class("ScheduledBackup", "postgresql.cnpg.io/v1", asyncio=True, plural="scheduledbackups")


class Databases:
    """Manage one isolated CloudNativePG cluster per Organization."""

    def __init__(self, client: "Kubernetes") -> None:
        """Share the Compute Kubernetes connection."""

        self._client = client

    async def apply(self, organization_id: UUID, password: str, storage_class: str, size_gib: int, instances: int) -> None:
        """Create the database boundary and wait for a writable PostgreSQL cluster."""

        # Reject invalid capacity and credentials before creating the namespace.
        if not password or not storage_class or size_gib < 1 or instances < 1:
            raise ValueError("Database password, storage class, size, and instance count are required")
        namespace = f"longlink-database-{organization_id.hex}"
        documents = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("solution", "database.yml"),
            namespace=namespace,
            compute_namespace=f"longlink-compute-{organization_id.hex}",
            storage_class=json.dumps(storage_class),
            size_gib=size_gib,
            instances=instances,
            quota_pods=2 * instances + 1,
            quota_instances=instances + 1,
            quota_storage_gib=size_gib * (instances + 1),
        )
        api = await self._client.api()

        # Establish independent database quota and ingress before CNPG creates any Pods.
        for document in documents[:-1]:
            resource = object_from_spec(document, api=api)
            await apply(resource)
        secret = Secret(
            {
                "metadata": {"name": "database-superuser", "namespace": namespace},
                "type": "kubernetes.io/basic-auth",
                "stringData": {"username": "postgres", "password": password},
            },
            api=api,
        )
        await apply(secret)
        cluster = ClusterResource(
            documents[-1],
            api=api,
        )
        await apply(cluster)
        await self.resume(organization_id)

    async def hibernate(self, organization_id: UUID) -> None:
        """Stop database Pods while retaining PVCs; callers serialize this with activation."""

        # Never intentionally shut down SQL beneath live compute, backup, or database maintenance work.
        if not await self.idle(organization_id):
            raise RuntimeError("Organization still has live Pods or pending compute/database work")
        cluster = ClusterResource(
            "database",
            namespace=f"longlink-database-{organization_id.hex}",
            api=await self._client.api(),
        )
        await cluster.patch({"metadata": {"annotations": {"cnpg.io/hibernation": "on"}}})
        async with asyncio.timeout(10 * 60):
            while not await self.is_hibernated(organization_id):
                await asyncio.sleep(5)

    async def resume(self, organization_id: UUID) -> None:
        """Wait for acknowledged wake and the expected ready, nonterminating database Pods."""

        # Clearing hibernation is idempotent; confirmed readiness is required before using SQL.
        api = await self._client.api()
        namespace = f"longlink-database-{organization_id.hex}"
        cluster = ClusterResource(
            "database",
            namespace=namespace,
            api=api,
        )
        await cluster.patch({"metadata": {"annotations": {"cnpg.io/hibernation": "off"}}})
        async with asyncio.timeout(10 * 60):
            while True:
                await cluster.refresh()
                status = cluster.raw.get("status", {})
                conditions = status.get("conditions", [])
                if (
                    cluster.metadata.get("annotations", {}).get("cnpg.io/hibernation") == "off"
                    and cluster.metadata.get("deletionTimestamp") is None
                    and status.get("readyInstances") == cluster.spec["instances"]
                    and any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in conditions)
                    and not any(condition.get("type") == "cnpg.io/hibernation" for condition in conditions)
                ):
                    # False hibernation conditions still mean shutdown; after removal, verify live Pod state too.
                    ready_pods = 0
                    async for pod in Pod.list(
                        api=api, namespace=namespace, label_selector={"cnpg.io/cluster": "database", "cnpg.io/podRole": "instance"}
                    ):
                        pod_status = pod.raw.get("status", {})
                        if (
                            pod.metadata.get("deletionTimestamp") is not None
                            or pod_status.get("phase") != "Running"
                            or not any(
                                condition.get("type") == "Ready" and condition.get("status") == "True"
                                for condition in pod_status.get("conditions", [])
                            )
                        ):
                            break
                        ready_pods += 1
                    else:
                        if ready_pods == cluster.spec["instances"]:
                            return
                await asyncio.sleep(5)

    async def is_hibernated(self, organization_id: UUID) -> bool:
        """Return confirmed hibernation, not merely the requested annotation."""

        # CNPG acknowledges successful shutdown through its documented condition.
        api = await self._client.api()
        namespace = f"longlink-database-{organization_id.hex}"
        cluster = ClusterResource(
            "database",
            namespace=namespace,
            api=api,
        )
        await cluster.refresh()
        if not any(
            condition.get("type") == "cnpg.io/hibernation" and condition.get("status") == "True"
            for condition in cluster.raw.get("status", {}).get("conditions", [])
        ):
            return False
        async for pod in Pod.list(api=api, namespace=namespace):
            if pod.raw.get("status", {}).get("phase") not in {"Succeeded", "Failed"}:
                return False
        return True

    async def idle(self, organization_id: UUID) -> bool:
        """Return whether live compute, runnable Jobs, and database backup/maintenance work are absent."""

        # Check all Pods rather than trusting labels; completed migration Jobs do not keep SQL awake.
        api = await self._client.api()
        async for pod in Pod.list(api=api, namespace=f"longlink-compute-{organization_id.hex}"):
            if pod.raw.get("status", {}).get("phase") not in {"Succeeded", "Failed"}:
                return False

        # An unsuspended migration can still start after a lost lease, even before its first Pod exists.
        async for job in Job.list(api=api, namespace=f"longlink-compute-{organization_id.hex}"):
            if job.spec.get("suspend") is not True and not any(
                condition.get("type") in {"Complete", "Failed"} and condition.get("status") == "True"
                for condition in job.raw.get("status", {}).get("conditions", [])
            ):
                return False

        # Plugin and snapshot backups can execute inside PostgreSQL without creating a separate Pod.
        namespace = f"longlink-database-{organization_id.hex}"
        async for backup in BackupResource.list(api=api, namespace=namespace):
            if backup.raw.get("status", {}).get("phase") not in {"completed", "failed"}:
                return False

        # Pending Jobs also block sleep before their Pods exist; retained terminal Jobs do not.
        async for job in Job.list(api=api, namespace=namespace):
            if not any(
                condition.get("type") in {"Complete", "Failed"} and condition.get("status") == "True"
                for condition in job.raw.get("status", {}).get("conditions", [])
            ):
                return False

        # Account for lingering Job Pods and standalone maintenance Pods, but not the database instances themselves.
        async for pod in Pod.list(api=api, namespace=namespace, label_selector="cnpg.io/podRole!=instance"):
            if pod.raw.get("status", {}).get("phase") not in {"Succeeded", "Failed"}:
                return False
        return True

    async def can_hibernate(self, organization_id: UUID) -> bool:
        """Reject sleep beneath compute, reconciliation, or autonomous backup schedules."""

        # Scheduled work does not acquire Platform leases, so enabled schedules require an awake database.
        if not await self.idle(organization_id):
            return False
        api = await self._client.api()
        namespace = f"longlink-database-{organization_id.hex}"
        cluster = ClusterResource(
            "database",
            api=api,
            namespace=namespace,
        )
        await cluster.refresh()
        status = cluster.raw.get("status", {})
        if (
            status.get("readyInstances") != cluster.spec.get("instances")
            or status.get("currentPrimary") != status.get("targetPrimary")
            or not any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in status.get("conditions", []))
        ):
            raise RuntimeError("Database is reconciling and cannot hibernate")

        # Enabled schedules can start unleased database work after the current idle check.
        async for schedule in ScheduledBackupResource.list(api=api, namespace=namespace):
            if schedule.spec.get("suspend") is not True:
                return False
        return True

    async def portforward(self, organization_id: UUID) -> int:
        """Forward private SQL to loopback until the owning Kubernetes client closes."""

        # Share Service selection and tunnel cleanup with the other development transports.
        return await self._client.portforward(
            "database-rw",
            f"longlink-database-{organization_id.hex}",
            5432,
        )

    async def certificate(self, organization_id: UUID) -> str:
        """Read the CNPG-generated server CA as PEM text, not a filesystem path."""

        # CNPG's default server CA Secret is named after its Cluster and survives hibernation.
        secret = Secret(
            "database-ca",
            namespace=f"longlink-database-{organization_id.hex}",
            api=await self._client.api(),
        )
        await secret.refresh()
        certificate = base64.b64decode(secret.raw["data"]["ca.crt"], validate=True).decode("ascii")
        ssl.create_default_context(cadata=certificate)
        return certificate

    async def delete(self, organization_id: UUID) -> None:
        """Delete the database namespace, including its Cluster, credentials, and PVCs."""

        # Namespace termination is the completion boundary for destructive database cleanup.
        resource = Namespace(
            f"longlink-database-{organization_id.hex}",
            api=await self._client.api(),
        )
        try:
            await resource.delete()
        except NotFoundError:
            return
        async with asyncio.timeout(10 * 60):
            await resource.wait("delete")

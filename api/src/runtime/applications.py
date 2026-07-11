import base64
from typing import Any, cast
from .cluster import KubernetesCluster
from .library import Pod, Secret, Service, APIObject, Deployment, kr8s
from src.utils import names, templates
from src.constants import ROOT


class Kubernetes(KubernetesCluster):
    """Manage Kubernetes namespaces, application workloads, and the cluster gateway."""

    async def pod(self, application_id: str) -> APIObject | None:
        """Return the pod for one managed application."""

        # Application UUIDs are globally unique, so pod lookup can span organization namespaces.
        try:
            pods = await self._list(Pod, kr8s.ALL, {"longlink.io/application-id": application_id})
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application pod") from exc

        # Applications run as single-pod workloads, but the pod may not exist yet during startup.
        return pods[0] if pods else None

    async def ready(self, application_id: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        # Application UUIDs are globally unique, so deployment lookup can span organization namespaces.
        try:
            deployments = await self._list(Deployment, kr8s.ALL, {"longlink.io/application-id": application_id})
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application deployment") from exc

        # The Deployment may not exist yet during initial startup.
        if not deployments:
            return False

        # Missing deployment status means Kubernetes has not reported readiness yet.
        deployment = deployments[0]
        if deployment.metadata is None or deployment.status is None:
            return False

        observed_generation = deployment.status.get("observedGeneration")
        generation = deployment.metadata.get("generation")

        return (
            generation is not None
            and observed_generation is not None
            and observed_generation >= generation
            and deployment.status.get("updatedReplicas") == 1
            and deployment.status.get("readyReplicas") == 1
        )

    async def create(self,organization: str,application_id: str,image: str,secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = names.knames(organization)

        # Replace the full Secret data map so removed environment keys do not survive a merge patch.
        secret_body: dict[str, Any] = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": application_id,
                "namespace": namespace,
                "labels": {
                    "compute-role": "application",
                    "app": application_id,
                    "longlink.io/application-id": application_id,
                },
            },
            "type": "Opaque",
            "data": {
                key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in secrets.items()
            },
        }
        await self._replace(secret_body)

        application_manifests = templates.readyml_list(
            ROOT / "templates" / "application.yml",
            image=image,
            namespace=namespace,
            application_id=application_id,
        )

        # Apply Deployment and Service manifests after the runtime Secret exists.
        for manifest in application_manifests:
            await self._upsert(manifest)

        await self._sync_gateway()
        return f"/{namespace}/{application_id}/"

    async def delete(self, application_id: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        # Delete all UUID-labeled workload resources across organization namespaces.
        for resource_class in (Deployment, Service, Secret):
            try:
                resources = await self._list(resource_class, kr8s.ALL, {"longlink.io/application-id": application_id})
            except kr8s.ServerError as exc:
                raise ValueError("Failed deleting application resources") from exc

            # Surface Kubernetes deletion failures with resource context.
            for resource in resources:
                try:
                    await cast(Any, resource).delete()
                except (kr8s.NotFoundError, kr8s.ServerError) as exc:
                    if not self._not_found(exc):
                        raise ValueError("Failed deleting application resources") from exc

        await self._sync_gateway()

    async def logs(self, application_id: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed application."""

        # Read the application pod before streaming logs from it.
        try:
            pod = await self.pod(application_id)
        except RuntimeError as exc:
            raise ValueError("Failed reading application pod") from exc

        # Logs require the single application pod to exist.
        if pod is None:
            raise ValueError("No application pod found")

        # Convert Kubernetes API failures into a simple client-facing adapter error.
        try:
            return [cast(str, line) async for line in cast(Any, pod).logs(tail_lines=lines)]
        except kr8s.ServerError as exc:
            raise ValueError("Failed reading application logs") from exc

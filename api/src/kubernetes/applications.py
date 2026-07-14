import kr8s
import base64
from typing import Any
from src.utils import names, templates
from contextlib import suppress
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, Deployment
from src.kubernetes.gateway import Gateway
from src.kubernetes.resources import KubernetesResources

TEMPLATES = files("src.kubernetes.templates")


class Applications:
    """Manage application workloads in one Kubernetes cluster."""

    def __init__(self, resources: KubernetesResources, gateway: Gateway) -> None:
        """Initialize workload management with shared cluster components."""

        self._resources = resources
        self._gateway = gateway

    async def pod(self, application_id: str) -> Pod | None:
        """Return the pod for one managed application."""

        pods = await self._resources.list(Pod, kr8s.ALL, {"longlink.io/application-id": application_id})
        return pods[0] if pods else None

    async def ready(self, application_id: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        deployments = await self._resources.list(Deployment, kr8s.ALL, {"longlink.io/application-id": application_id})

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

    async def create(self, organization: str, application_id: str, image: str, secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = names.knames(organization)
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
            "data": {key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in secrets.items()},
        }
        await self._resources.replace(secret_body)
        application_manifests = templates.readyml_list(
            TEMPLATES.joinpath("application.yml"),
            image=image,
            namespace=namespace,
            application_id=application_id,
        )

        # Apply Deployment and Service manifests after the runtime Secret exists.
        for manifest in application_manifests:
            await self._resources.upsert(manifest)

        await self._gateway.sync()
        return f"/{namespace}/{application_id}/"

    async def delete(self, application_id: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        # Delete all UUID-labeled workload resources across organization namespaces.
        for resource_class in (Deployment, Service, Secret):
            resources = await self._resources.list(resource_class, kr8s.ALL, {"longlink.io/application-id": application_id})

            # Ignore resources deleted after the list request while preserving other failures.
            for resource in resources:
                with suppress(kr8s.NotFoundError):
                    await resource.delete()

        await self._gateway.sync()

    async def logs(self, application_id: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed application."""

        pod = await self.pod(application_id)
        if pod is None:
            raise ValueError("No application pod found")

        return [line async for line in pod.logs(tail_lines=lines)]

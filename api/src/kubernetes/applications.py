import json
import base64
import asyncio
import binascii
from uuid import UUID
from src.utils import templates
from collections.abc import Mapping
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, APIObject, Namespace, Deployment
from src.kubernetes.resources import KubernetesResources, deployment_is_ready

APPLICATION_ID_LABEL = "longlink.io/application-id"


def pod_is_active(pod: Pod) -> bool:
    """Return whether one Pod can still start or execute Application code."""

    # Unknown and nonterminal provider states remain active for safe credential cleanup.
    status = pod.raw.get("status")
    return not isinstance(status, dict) or status.get("phase") not in {"Succeeded", "Failed"}


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._resources = resources

    async def stage_envs(
        self,
        application_id: UUID,
        namespace: str,
        envs: Mapping[str, str],
        *,
        require_deployment: bool = False,
    ) -> None:
        """Stage user-owned values and roll an existing workload when present."""

        # Repeated seed and API attempts converge the Secret before lifecycle work starts.
        secret = await self._resources.replace_secret(f"{application_id}-environment", namespace, envs)
        deployment = await self._resources.read(Deployment, str(application_id), namespace)
        if deployment is None:
            if require_deployment:
                raise ValueError("Kubernetes Application Deployment is missing")
            return

        # Roll an existing workload when staged values change before a lifecycle retry.
        resource_version = secret.metadata.get("resourceVersion")
        if not isinstance(resource_version, str):
            raise TypeError("Kubernetes Application environment Secret is missing its resource version")
        await self._resources.patch(
            Deployment,
            str(application_id),
            {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {
                                "longlink.io/environment-secret-resource-version": resource_version,
                            }
                        }
                    }
                }
            },
            namespace,
        )

    async def stage_runtime_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Commit Platform-owned runtime values before creating the Application workload."""

        await self._resources.create_secret(f"{application_id}-runtime", namespace, envs)

    async def read_runtime_envs(self, application_id: UUID, namespace: str) -> dict[str, str] | None:
        """Read Platform-owned values from one Application runtime Secret."""

        # Read the exact Secret from the Organization Namespace.
        secret = await self._resources.read(Secret, f"{application_id}-runtime", namespace)
        if secret is None:
            if await self._resources.read(Deployment, str(application_id), namespace) is not None:
                raise ValueError("Kubernetes Application runtime Secret is missing")
            return None

        # Kubernetes returns Secret data as strict base64-encoded UTF-8 values.
        body = secret.raw
        data = body.get("data", {})
        if data is None:
            data = {}
        if not isinstance(data, dict) or not all(isinstance(name, str) and isinstance(value, str) for name, value in data.items()):
            raise TypeError("Kubernetes Application runtime Secret data must contain string values")
        envs: dict[str, str] = {}
        for name, value in data.items():
            try:
                envs[name] = base64.b64decode(value, validate=True).decode("utf-8")
            except (binascii.Error, UnicodeDecodeError) as exc:
                raise ValueError(f"Kubernetes Application runtime Secret value {name!r} is invalid") from exc
        return envs

    async def apply(self, application_id: UUID, namespace: str, image: str) -> None:
        """Deploy one Application and wait for its rollout."""

        # Render workload resources before the first cluster mutation.
        deployment, service = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=str(application_id),
            image=json.dumps(image),
            namespace=namespace,
        )

        # Establish stable Service discovery before creating Application Pods.
        await self._resources.apply(Service, service)
        await self._resources.apply(Deployment, deployment)

        # Poll rollout status without repeatedly applying the same Application revision.
        while True:
            deployed = await self._resources.read(Deployment, str(application_id), namespace)
            if deployed is None:
                raise RuntimeError("Kubernetes Application Deployment disappeared during rollout")
            if deployment_is_ready(deployed):
                return
            await asyncio.sleep(5)

    async def delete(self, application_id: UUID, namespace: str) -> None:
        """Delete one Application and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        canonical_id = str(application_id)
        while await self._resources.read(Namespace, namespace) is not None:
            resources: tuple[APIObject | None, ...] = (
                await self._resources.read(Deployment, canonical_id, namespace),
                await self._resources.read(Service, f"app-{canonical_id}", namespace),
                await self._resources.read(Secret, f"{canonical_id}-environment", namespace),
                await self._resources.read(Secret, f"{canonical_id}-runtime", namespace),
            )
            for resource in resources:
                if resource is not None and resource.metadata.get("deletionTimestamp") is None:
                    await self._resources.delete(type(resource), resource.name, namespace)

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: canonical_id})
            if all(resource is None for resource in resources) and not any(pod_is_active(pod) for pod in pods):
                return
            await asyncio.sleep(5)

    async def logs(self, application_id: UUID, namespace: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # A missing Pod has no diagnostic log stream.
        pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: str(application_id)})
        active = [pod for pod in pods if pod_is_active(pod)]
        if not active:
            raise ValueError("No Application Pod found")
        pod = min(active, key=lambda item: item.name)
        return [line async for line in pod.logs(tail_lines=lines)]

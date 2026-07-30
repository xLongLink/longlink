import json
import base64
import asyncio
import binascii
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from collections.abc import Mapping
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, Namespace, Deployment
from src.kubernetes.client import deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

APPLICATION_ID_LABEL = "longlink.io/application-id"
RUNTIME_ENV_PREFIX = "LONGLINK_"


def secret_values(secret: Secret) -> dict[str, str]:
    """Decode the string values stored in one Kubernetes Secret."""

    # Kubernetes returns Secret data as strict base64-encoded UTF-8 values.
    data = secret.raw.get("data", {})
    if not isinstance(data, dict) or not all(isinstance(name, str) and isinstance(value, str) for name, value in data.items()):
        raise TypeError("Kubernetes Application Secret data must contain string values")
    envs: dict[str, str] = {}
    for name, value in data.items():
        try:
            envs[name] = base64.b64decode(value, validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError) as exc:
            raise ValueError(f"Kubernetes Application Secret value {name!r} is invalid") from exc
    return envs


def pod_is_active(pod: Pod) -> bool:
    """Return whether one Pod can still start or execute Application code."""

    # Unknown and nonterminal provider states remain active for safe credential cleanup.
    status = pod.raw.get("status")
    return not isinstance(status, dict) or status.get("phase") not in {"Succeeded", "Failed"}


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._client = client

    async def replace_secret(
        self,
        application_id: UUID,
        namespace: str,
        envs: Mapping[str, str],
        preserve_platform_values: bool,
    ) -> None:
        """Replace shared Application values while retaining the other owner domain."""

        # Read and retain values owned by the caller outside this update boundary.
        api = await self._client.api()
        secret = Secret(str(application_id), namespace=namespace, api=api)
        existing: dict[str, str] = {}
        if await secret.exists():
            await secret.refresh()
            existing = secret_values(secret)
            await secret.delete()
        preserved = {
            name: value
            for name, value in existing.items()
            if name.startswith(RUNTIME_ENV_PREFIX) is preserve_platform_values
        }

        # Recreate the Secret with the complete user and Platform configuration.
        await Secret(
            {
                "metadata": {"name": str(application_id), "namespace": namespace},
                "stringData": {**preserved, **envs},
            },
            api=api,
        ).create()

    async def stage_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Stage user-owned values for the next Application deployment."""

        # Keep Platform-owned values separate from the user environment supplied at this boundary.
        if any(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application environment cannot include LongLink-managed variables")

        # Preserve Platform-owned values while replacing the complete user environment.
        await self.replace_secret(application_id, namespace, envs, preserve_platform_values=True)

    async def stage_runtime_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Commit Platform-owned runtime values before creating the Application workload."""

        # Keep user-owned values while replacing the complete Platform runtime contract.
        if not envs or not all(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application runtime must contain only LongLink-managed variables")
        await self.replace_secret(application_id, namespace, envs, preserve_platform_values=False)

    async def apply(self, application_id: UUID, namespace: str, image: str) -> None:
        """Deploy one Application and wait for its rollout."""

        # Render workload resources before the first cluster mutation.
        deployment, service = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=str(application_id),
            application_id_label=APPLICATION_ID_LABEL,
            image=json.dumps(image),
            namespace=namespace,
        )

        # Create or update the Service before the Deployment starts Application Pods.
        api = await self._client.api()
        service_resource = Service(service, api=api)
        if await service_resource.exists():
            await service_resource.patch(service)
        else:
            await service_resource.create()
        deployment_resource = Deployment(deployment, api=api)
        if await deployment_resource.exists():
            await deployment_resource.patch(deployment)
        else:
            await deployment_resource.create()

        # Poll rollout status without repeatedly applying the same Application revision.
        while True:
            deployed = Deployment(str(application_id), namespace=namespace, api=api)
            if not await deployed.exists():
                raise RuntimeError("Kubernetes Application Deployment disappeared during rollout")
            await deployed.refresh()
            if deployment_is_ready(deployed):
                return
            await asyncio.sleep(5)

    async def delete(self, application_id: UUID, namespace: str) -> None:
        """Delete one Application and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        api = await self._client.api()
        namespace_resource = Namespace(namespace, api=api)
        while await namespace_resource.exists():
            resources = (
                Deployment(str(application_id), namespace=namespace, api=api),
                Service(f"app-{application_id}", namespace=namespace, api=api),
                Secret(str(application_id), namespace=namespace, api=api),
            )
            existing = []
            for resource in resources:
                if await resource.exists():
                    await resource.refresh()
                    existing.append(resource)
                    if resource.metadata.get("deletionTimestamp") is None:
                        await resource.delete()

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            pods = [
                pod
                async for pod in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)})
                if isinstance(pod, Pod)
            ]
            if not existing and not any(pod_is_active(pod) for pod in pods):
                return
            await asyncio.sleep(5)

    async def logs(self, application_id: UUID, namespace: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # A missing Pod has no diagnostic log stream.
        api = await self._client.api()
        pods = [
            pod
            async for pod in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)})
            if isinstance(pod, Pod)
        ]
        active = [pod for pod in pods if pod_is_active(pod)]
        if not active:
            raise ValueError("No Application Pod found")
        pod = min(active, key=lambda item: item.name)
        return [line async for line in pod.logs(tail_lines=lines)]

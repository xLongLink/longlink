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

        # Keep Platform-owned values separate from the user environment supplied at this boundary.
        if any(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application environment cannot include LongLink-managed variables")

        # Preserve Platform-owned values while replacing the complete user environment.
        secret = await self._resources.read(Secret, str(application_id), namespace)
        if secret is None:
            runtime_envs = {}
        else:
            runtime_envs = {name: value for name, value in secret_values(secret).items() if name.startswith(RUNTIME_ENV_PREFIX)}
        secret = await self._resources.replace_secret(str(application_id), namespace, {**runtime_envs, **envs})
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

        # Keep user-owned values while replacing the complete Platform runtime contract.
        if not envs or not all(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application runtime must contain only LongLink-managed variables")
        secret = await self._resources.read(Secret, str(application_id), namespace)
        if secret is None:
            user_envs = {}
        else:
            user_envs = {name: value for name, value in secret_values(secret).items() if not name.startswith(RUNTIME_ENV_PREFIX)}
        await self._resources.replace_secret(str(application_id), namespace, {**user_envs, **envs})

    async def read_runtime_envs(self, application_id: UUID, namespace: str) -> dict[str, str] | None:
        """Read Platform-owned values from one shared Application Secret."""

        # Read the exact Application Secret from the Organization Namespace.
        secret = await self._resources.read(Secret, str(application_id), namespace)
        runtime_envs = {} if secret is None else {
            name: value for name, value in secret_values(secret).items() if name.startswith(RUNTIME_ENV_PREFIX)
        }
        if runtime_envs:
            return runtime_envs

        # A deployed Application must retain its Platform runtime values.
        if await self._resources.read(Deployment, str(application_id), namespace) is not None:
            raise ValueError("Kubernetes Application runtime values are missing")
        return None

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
        while await self._resources.read(Namespace, namespace) is not None:
            resources: tuple[APIObject | None, ...] = await asyncio.gather(
                self._resources.read(Deployment, str(application_id), namespace),
                self._resources.read(Service, f"app-{application_id}", namespace),
                self._resources.read(Secret, str(application_id), namespace),
            )
            for resource in resources:
                if resource is not None and resource.metadata.get("deletionTimestamp") is None:
                    await self._resources.delete(type(resource), resource.name, namespace)

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: str(application_id)})
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

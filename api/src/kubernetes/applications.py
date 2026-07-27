import json
import base64
import binascii
from uuid import UUID
from src.utils import templates
from dataclasses import dataclass
from collections.abc import Mapping
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, APIObject, Namespace, Deployment
from src.kubernetes.resources import KubernetesDocument, KubernetesResources

APPLICATION_ID_LABEL = "longlink.io/application-id"
ENVIRONMENT_SECRET_VERSION_ANNOTATION = "longlink.io/environment-secret-resource-version"


def environment_secret_name(application_id: UUID) -> str:
    """Return one Application's user-owned environment Secret name."""

    return f"{application_id}-environment"


def runtime_secret_name(application_id: UUID) -> str:
    """Return one Application's Platform-owned runtime Secret name."""

    return f"{application_id}-runtime"


def pod_is_active(pod: Pod) -> bool:
    """Return whether one Pod can still start or execute Application code."""

    # Unknown and nonterminal provider states remain active for safe credential cleanup.
    status = pod.raw.get("status")
    return not isinstance(status, dict) or status.get("phase") not in {"Succeeded", "Failed"}


@dataclass(frozen=True, slots=True)
class DesiredApplication:
    """Describe one Application workload for its explicit deployment action."""

    id: UUID
    namespace: str
    image: str


@dataclass(frozen=True, slots=True)
class ApplicationManifests:
    """Hold one Application's workload resources."""

    service: KubernetesDocument
    deployment: KubernetesDocument


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._resources = resources

    def environment_secret(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> KubernetesDocument:
        """Build one Application's exact user-owned environment Secret."""

        # Keep Secret data deterministic for comparison and replacement.
        return {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": environment_secret_name(application_id),
                "namespace": namespace,
            },
            "type": "Opaque",
            "stringData": dict(sorted(envs.items())),
        }

    def runtime_secret(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> KubernetesDocument:
        """Build one Application's exact Platform-owned runtime Secret."""

        # Keep Platform runtime data deterministic and separate from user-owned values.
        return {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": runtime_secret_name(application_id),
                "namespace": namespace,
            },
            "type": "Opaque",
            "stringData": dict(sorted(envs.items())),
        }

    def manifests(self, application: DesiredApplication) -> ApplicationManifests:
        """Render one Application's Service and Deployment from lifecycle input."""

        # Render workload resources that reference the separately owned Secrets by stable name.
        manifests = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=str(application.id),
            image=json.dumps(application.image),
            namespace=application.namespace,
        )
        return ApplicationManifests(
            service=manifests[1],
            deployment=manifests[0],
        )

    async def stage_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Stage user-owned values before the Application workload exists."""

        await self._resources.create_secret(self.environment_secret(application_id, namespace, envs))

    async def stage_runtime_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Commit Platform-owned runtime values before creating the Application workload."""

        await self._resources.create_secret(self.runtime_secret(application_id, namespace, envs))

    async def read_runtime_envs(self, application_id: UUID, namespace: str) -> dict[str, str] | None:
        """Read Platform-owned values from one Application runtime Secret."""

        return await self._read_secret_envs(runtime_secret_name(application_id), namespace, "runtime")

    async def _read_secret_envs(self, name: str, namespace: str, kind: str) -> dict[str, str] | None:
        """Decode strict UTF-8 environment values from one Kubernetes Secret."""

        # Read the exact Secret from the Organization Namespace.
        secret = await self._resources.read(Secret, name, namespace)
        if secret is None:
            return None

        # Kubernetes returns Secret data as strict base64-encoded UTF-8 values.
        body = secret.to_dict()
        data = body.get("data", {})
        if data is None:
            data = {}
        if not isinstance(data, dict) or not all(isinstance(name, str) and isinstance(value, str) for name, value in data.items()):
            raise TypeError(f"Kubernetes Application {kind} Secret data must contain string values")
        envs: dict[str, str] = {}
        for name, value in data.items():
            try:
                envs[name] = base64.b64decode(value, validate=True).decode("utf-8")
            except (binascii.Error, UnicodeDecodeError) as exc:
                raise ValueError(f"Kubernetes Application {kind} Secret value {name!r} is invalid") from exc
        return envs

    async def replace_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Replace user-owned values and roll the Application without reading runtime credentials."""

        # Replace only the user-owned Secret and use its stable revision as the rollout trigger.
        secret = await self._resources.replace_secret(self.environment_secret(application_id, namespace, envs))
        metadata = secret.raw.get("metadata")
        resource_version = metadata.get("resourceVersion") if isinstance(metadata, dict) else None
        if not isinstance(resource_version, str):
            raise TypeError("Kubernetes Application environment Secret is missing its resource version")

        # Merge only the user Secret annotation so runtime configuration and workload fields remain untouched.
        await self._resources.merge_patch(
            Deployment,
            str(application_id),
            {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {
                                ENVIRONMENT_SECRET_VERSION_ANNOTATION: resource_version,
                            }
                        }
                    }
                }
            },
            namespace,
        )

    async def apply(self, application: DesiredApplication) -> None:
        """Deploy one Application against its already staged Secrets."""

        # Render workload resources before the first cluster mutation.
        manifests = self.manifests(application)

        # Establish stable Service discovery before creating Application Pods.
        await self._resources.apply(manifests.service)
        await self._resources.apply(manifests.deployment)

    async def deployed(self, application_id: UUID, namespace: str) -> bool:
        """Return whether the canonical Application Deployment exists."""

        return await self._resources.read(Deployment, str(application_id), namespace) is not None

    async def delete(self, application_id: UUID, namespace: str) -> bool:
        """Request Application resource deletion and return whether its Pods have terminated."""

        # A missing Organization Namespace means all namespaced resources are gone.
        if await self._resources.read(Namespace, namespace) is None:
            return True

        # Read every canonical resource before issuing each deletion once.
        canonical_id = str(application_id)
        resources: tuple[tuple[type[APIObject], APIObject | None], ...] = (
            (Deployment, await self._resources.read(Deployment, canonical_id, namespace)),
            (Service, await self._resources.read(Service, f"app-{canonical_id}", namespace)),
            (Secret, await self._resources.read(Secret, environment_secret_name(application_id), namespace)),
            (Secret, await self._resources.read(Secret, runtime_secret_name(application_id), namespace)),
        )
        for resource_class, resource in resources:
            if resource is None:
                continue
            metadata = resource.raw.get("metadata")
            if not isinstance(metadata, dict):
                raise TypeError(f"Kubernetes {resource.kind} response must include metadata")
            if metadata.get("deletionTimestamp") is None:
                await self._resources.delete(resource_class, resource.name, namespace)

        # Provider cleanup must not race a remaining resource or Pod that can still use runtime credentials.
        pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: canonical_id})
        return not any(resource is not None for _, resource in resources) and not any(pod_is_active(pod) for pod in pods)

    async def ready(self, application_id: str, namespace: str) -> bool:
        """Return whether one canonical Application Deployment rollout is ready."""

        # A missing Deployment is a normal pending lifecycle state.
        deployment = await self._resources.read(Deployment, application_id, namespace)
        if deployment is None:
            return False
        metadata = deployment.raw.get("metadata")
        status = deployment.raw.get("status")
        if not isinstance(metadata, dict) or not isinstance(status, dict):
            return False
        observed_generation = status.get("observedGeneration")
        generation = metadata.get("generation")
        return (
            isinstance(generation, int)
            and isinstance(observed_generation, int)
            and observed_generation >= generation
            and status.get("updatedReplicas") == 1
            and status.get("readyReplicas") == 1
        )

    async def pod(self, application_id: str, namespace: str) -> Pod | None:
        """Return one current Pod for a managed Application in its expected Namespace."""

        pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: application_id})
        active = [pod for pod in pods if pod_is_active(pod)]
        return sorted(active, key=lambda pod: pod.name)[0] if active else None

    async def logs(self, application_id: str, namespace: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # A missing Pod has no diagnostic log stream.
        pod = await self.pod(application_id, namespace)
        if pod is None:
            raise ValueError("No Application Pod found")
        return [line async for line in pod.logs(tail_lines=lines)]

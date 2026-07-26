import re
import json
import time
import base64
import asyncio
import binascii
from uuid import UUID
from src.utils import names, templates
from dataclasses import field, dataclass
from collections.abc import Mapping
from src.environments import env
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, Namespace, Deployment
from src.kubernetes.resources import KubernetesDocument, KubernetesResources, pod_is_active, resource_version, set_pod_annotation

APPLICATION_ID_LABEL = "longlink.io/application-id"
ENVIRONMENT_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
IMMUTABLE_IMAGE = re.compile(r"@sha256:[0-9a-f]{64}$")
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2


@dataclass(frozen=True, slots=True)
class DesiredApplication:
    """Describe one Application workload for its explicit deployment action."""

    id: UUID
    namespace: str
    image: str


@dataclass(frozen=True, slots=True)
class ApplicationManifests:
    """Hold one Application's exact Secret and workload resources."""

    secret: KubernetesDocument = field(repr=False)
    service: KubernetesDocument
    deployment: KubernetesDocument


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._resources = resources

    def environment_secret(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> KubernetesDocument:
        """Build one Application's exact environment Secret."""

        # Validate and sort the exact Secret data before writing it to Kubernetes.
        names.knames(namespace)
        invalid_envs = sorted(name for name in envs if ENVIRONMENT_NAME.fullmatch(name) is None)
        if invalid_envs:
            raise ValueError(f"Application has invalid environment names: {', '.join(invalid_envs)}")
        if not all(isinstance(value, str) for value in envs.values()):
            raise TypeError("Application environment values must be strings")
        sorted_envs = dict(sorted(envs.items()))
        canonical_id = str(application_id)
        return {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": canonical_id,
                "namespace": namespace,
            },
            "type": "Opaque",
            "stringData": sorted_envs,
        }

    def manifests(self, application: DesiredApplication, *, envs: Mapping[str, str]) -> ApplicationManifests:
        """Render one Application's Secret, Service, and Deployment from immutable lifecycle input."""

        # Render the exact Secret and workload resources from the same Application identity.
        application_id = str(application.id)
        secret = self.environment_secret(application.id, application.namespace, envs)
        manifests = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=application_id,
            image=json.dumps(application.image),
            namespace=application.namespace,
        )

        # Deployment and Service order is fixed by the packaged Application template.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Deployment", "Service"):
            raise ValueError("Application template resources are incomplete or out of order")
        return ApplicationManifests(secret=secret, service=manifests[1], deployment=manifests[0])

    async def stage_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Stage user-owned environment values in the canonical Application Secret."""

        # User values must never claim Platform-managed runtime names.
        reserved = sorted(name for name in envs if name.startswith("LONGLINK_"))
        if reserved:
            raise ValueError(f"Application environment contains reserved names: {', '.join(reserved)}")
        await self._resources.replace_application_secret(self.environment_secret(application_id, namespace, envs))

    async def read_envs(self, application_id: UUID, namespace: str) -> dict[str, str] | None:
        """Read user-owned values from one canonical Application Secret."""

        # Read the canonical Secret from the Organization Namespace.
        canonical_id = str(application_id)
        secret = await self._resources.read(Secret, canonical_id, namespace)
        if secret is None:
            return None

        # Kubernetes returns Secret data as strict base64-encoded UTF-8 values.
        body = secret.to_dict()
        data = body.get("data", {})
        if data is None:
            data = {}
        if not isinstance(data, dict) or not all(isinstance(name, str) and isinstance(value, str) for name, value in data.items()):
            raise TypeError("Kubernetes Application Secret data must contain string values")
        envs: dict[str, str] = {}
        for name, value in data.items():
            if name.startswith("LONGLINK_"):
                continue
            try:
                envs[name] = base64.b64decode(value, validate=True).decode("utf-8")
            except (binascii.Error, UnicodeDecodeError) as exc:
                raise ValueError(f"Kubernetes Application Secret value {name!r} is invalid") from exc
        return envs

    async def apply(
        self,
        application: DesiredApplication,
        *,
        envs: Mapping[str, str],
    ) -> None:
        """Deploy one Application exactly for its explicit creation lifecycle."""

        # Validate runtime identities before the first cluster mutation.
        names.knames(application.namespace)
        if not application.image.strip():
            raise ValueError("Application image must not be empty")
        if not env.DEVELOPMENT and IMMUTABLE_IMAGE.search(application.image) is None:
            raise ValueError("Application image must use an immutable digest")
        manifests = self.manifests(
            application,
            envs=envs,
        )

        # Establish exact configuration and stable Service discovery before creating Application Pods.
        secret = await self._resources.replace_application_secret(manifests.secret)
        set_pod_annotation(manifests.deployment, "longlink.io/secret-resource-version", resource_version(secret))
        await self._resources.apply_application(manifests.service)
        await self._resources.apply_application_deployment(manifests.deployment)

    async def delete(self, application_id: UUID, namespace: str) -> None:
        """Delete one exact Application workload and wait until its Pods terminate."""

        # Exact names and the Organization Namespace bound lifecycle deletion.
        names.knames(namespace)
        if await self._resources.read(Namespace, namespace) is None:
            return
        canonical_id = str(application_id)
        await self._resources.delete_application(
            Deployment,
            canonical_id,
            namespace,
        )
        await self._resources.delete_application(
            Service,
            f"app-{canonical_id}",
            namespace,
        )
        await self._resources.delete_application(
            Secret,
            canonical_id,
            namespace,
        )

        # Provider cleanup must not race a terminating Pod that still holds runtime credentials.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while True:
            deployment = await self._resources.read(Deployment, canonical_id, namespace)
            service = await self._resources.read(Service, f"app-{canonical_id}", namespace)
            secret = await self._resources.read(Secret, canonical_id, namespace)
            pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: canonical_id})
            if deployment is None and service is None and secret is None and not any(pod_is_active(pod) for pod in pods):
                return
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Application {canonical_id!r} did not terminate before lifecycle cleanup")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def ready(self, application_id: str, namespace: str) -> bool:
        """Return whether one canonical Application Deployment rollout is ready."""

        # A missing Deployment is a normal pending lifecycle state.
        deployment = await self._resources.read(Deployment, application_id, namespace)
        if deployment is None or deployment.metadata is None or deployment.status is None:
            return False
        observed_generation = deployment.status.get("observedGeneration")
        generation = deployment.metadata.get("generation")
        return (
            isinstance(generation, int)
            and isinstance(observed_generation, int)
            and observed_generation >= generation
            and deployment.status.get("updatedReplicas") == 1
            and deployment.status.get("readyReplicas") == 1
        )

    async def wait_ready(self, application_id: str, namespace: str) -> None:
        """Wait boundedly for one explicitly deployed Application to become ready."""

        # Poll the canonical Deployment until its observed rollout is ready or the lifecycle deadline expires.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while not await self.ready(application_id, namespace):
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Application {application_id!r} did not become ready")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

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

import re
import hmac
import json
import time
import asyncio
import hashlib
from uuid import UUID
from src.utils import names, templates
from dataclasses import field, dataclass
from collections.abc import Mapping
from src.environments import env
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, Namespace, Deployment
from src.adapters.postgres import DatabaseRuntimeConnection
from src.kubernetes.resources import (
    COMPUTE_ID_LABEL,
    ResourceScope,
    KubernetesDocument,
    KubernetesResources,
    pod_is_active,
    resource_version,
    set_pod_annotation,
)
from src.adapters.storage.base import StorageRuntimeCredentials
from src.models.infrastructure import exoscale_zone

APPLICATION_TEMPLATES = files("src.kubernetes.templates").joinpath("application")
TEMPLATE_REVISION = "2026-07-20.1"
APPLICATION_ID_LABEL = "longlink.io/application-id"
ORGANIZATION_ID_LABEL = "longlink.io/organization-id"
ENVIRONMENT_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
IMMUTABLE_IMAGE = re.compile(r"@sha256:[0-9a-f]{64}$")
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2


@dataclass(frozen=True, slots=True)
class DesiredApplication:
    """Describe one Application workload for its explicit deployment action."""

    id: UUID
    organization_id: UUID
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

    def manifests(
        self,
        application: DesiredApplication,
        compute_id: str,
        revision_key: str,
        platform_version: str,
        *,
        envs: Mapping[str, str],
        connection: DatabaseRuntimeConnection,
        storage_endpoint_url: str,
        storage_credentials: StorageRuntimeCredentials,
    ) -> ApplicationManifests:
        """Render one Application's Secret, Service, and Deployment from immutable lifecycle input."""

        # Construct runtime-only values at the Kubernetes boundary so desired state cannot expose credentials.
        runtime_envs = {
            **envs,
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": connection["host"],
            "LONGLINK_DATABASE_NAME": connection["database_name"],
            "LONGLINK_DATABASE_PASSWORD": connection["password"],
            "LONGLINK_DATABASE_PORT": str(connection["port"]),
            "LONGLINK_DATABASE_SCHEMA": application.id.hex,
            "LONGLINK_DATABASE_SSLMODE": connection["sslmode"].value,
            "LONGLINK_DATABASE_USERNAME": connection["username"],
            "LONGLINK_STORAGE_BUCKET": application.organization_id.hex,
            "LONGLINK_STORAGE_ENDPOINT_URL": storage_endpoint_url,
            "LONGLINK_STORAGE_PASSWORD": storage_credentials["secret_access_key"],
            "LONGLINK_STORAGE_PREFIX": f"applications/{application.id.hex}/",
            "LONGLINK_STORAGE_REGION": exoscale_zone(storage_endpoint_url),
            "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
            "LONGLINK_STORAGE_USERNAME": storage_credentials["access_key_id"],
        }

        # Validate and hash the exact Secret data so every runtime change rolls Application Pods.
        invalid_envs = sorted(name for name in runtime_envs if ENVIRONMENT_NAME.fullmatch(name) is None)
        if invalid_envs:
            raise ValueError(f"Application has invalid environment names: {', '.join(invalid_envs)}")
        if not all(isinstance(value, str) for value in runtime_envs.values()):
            raise TypeError("Application environment values must be strings")
        source = APPLICATION_TEMPLATES.joinpath("application.yml")
        sorted_envs = dict(sorted(runtime_envs.items()))
        revision_input = json.dumps(
            {
                "envs": sorted_envs,
                "id": str(application.id),
                "image": application.image,
                "namespace": application.namespace,
                "organization_id": str(application.organization_id),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        runtime_revision = hmac.new(revision_key.encode("utf-8"), revision_input.encode(), hashlib.sha256).hexdigest()
        application_id = str(application.id)
        labels = {
            "app": application_id,
            "app.kubernetes.io/managed-by": "longlink-platform",
            "compute-role": "application",
            APPLICATION_ID_LABEL: application_id,
            COMPUTE_ID_LABEL: compute_id,
            ORGANIZATION_ID_LABEL: str(application.organization_id),
            "longlink.io/resource-scope": ResourceScope.application.value,
        }
        secret: KubernetesDocument = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": application_id,
                "namespace": application.namespace,
                "annotations": {"longlink.io/runtime-revision": runtime_revision},
                "labels": labels,
            },
            "type": "Opaque",
            "stringData": sorted_envs,
        }
        manifests = templates.readyml_list(
            source,
            application_id=application_id,
            image=json.dumps(application.image),
            compute_id=compute_id,
            namespace=application.namespace,
            organization_id=str(application.organization_id),
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )

        # Deployment and Service order is fixed by the packaged Application template.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Deployment", "Service"):
            raise ValueError("Application template resources are incomplete or out of order")
        return ApplicationManifests(secret=secret, service=manifests[1], deployment=manifests[0])

    async def apply(
        self,
        application: DesiredApplication,
        compute_id: str,
        revision_key: str,
        platform_version: str,
        *,
        envs: Mapping[str, str],
        connection: DatabaseRuntimeConnection,
        storage_endpoint_url: str,
        storage_credentials: StorageRuntimeCredentials,
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
            compute_id,
            revision_key,
            platform_version,
            envs=envs,
            connection=connection,
            storage_endpoint_url=storage_endpoint_url,
            storage_credentials=storage_credentials,
        )

        # Establish exact configuration and stable Service discovery before creating Application Pods.
        secret = await self._resources.replace_secret(manifests.secret)
        set_pod_annotation(manifests.deployment, "longlink.io/secret-resource-version", resource_version(secret))
        await self._resources.apply(manifests.service)
        await self._resources.apply_deployment(manifests.deployment)

    async def delete(self, application_id: UUID, organization_id: UUID, namespace: str, compute_id: str) -> None:
        """Delete one exact Application workload and wait until its Pods terminate."""

        # Exact names and identity labels prevent lifecycle deletion from becoming omission-based reconciliation.
        names.knames(namespace)
        if await self._resources.read(Namespace, namespace) is None:
            return
        canonical_id = str(application_id)
        labels = {
            APPLICATION_ID_LABEL: canonical_id,
            ORGANIZATION_ID_LABEL: str(organization_id),
        }
        await self._resources.delete_owned(
            Deployment,
            canonical_id,
            compute_id,
            ResourceScope.application,
            namespace,
            labels,
        )
        await self._resources.delete_owned(
            Service,
            f"app-{canonical_id}",
            compute_id,
            ResourceScope.application,
            namespace,
            labels,
        )
        await self._resources.delete_owned(
            Secret,
            canonical_id,
            compute_id,
            ResourceScope.application,
            namespace,
            labels,
        )

        # Provider cleanup must not race a terminating Pod that still holds runtime credentials.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while True:
            deployment = await self._resources.read(Deployment, canonical_id, namespace)
            service = await self._resources.read(Service, f"app-{canonical_id}", namespace)
            secret = await self._resources.read(Secret, canonical_id, namespace)
            pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: canonical_id, COMPUTE_ID_LABEL: compute_id})
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

        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while not await self.ready(application_id, namespace):
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Application {application_id!r} did not become ready")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def pod(self, application_id: str, namespace: str, compute_id: str | None = None) -> Pod | None:
        """Return one current Pod for a managed Application in its expected Namespace."""

        selectors = {APPLICATION_ID_LABEL: application_id}
        if compute_id is not None:
            selectors[COMPUTE_ID_LABEL] = compute_id
        pods = await self._resources.list(Pod, namespace, selectors)
        active = [pod for pod in pods if pod_is_active(pod)]
        return sorted(active, key=lambda pod: pod.name)[0] if active else None

    async def logs(self, application_id: str, namespace: str, compute_id: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # A missing Pod has no diagnostic log stream.
        pod = await self.pod(application_id, namespace, compute_id)
        if pod is None:
            raise ValueError("No Application Pod found")
        return [line async for line in pod.logs(tail_lines=lines)]

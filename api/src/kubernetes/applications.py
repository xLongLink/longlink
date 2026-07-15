import re
import hmac
import json
import kr8s
import hashlib
from typing import TYPE_CHECKING
from src.utils import templates
from dataclasses import dataclass
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Deployment
from src.kubernetes.resources import KubernetesDocument, KubernetesResources

if TYPE_CHECKING:
    from src.kubernetes.reconcile import DesiredApplication, DesiredOrganization

TEMPLATES = files("src.kubernetes.templates")
TEMPLATE_REVISION = "2026-07-14.2"
APPLICATION_ID_LABEL = "longlink.io/application-id"
ORGANIZATION_ID_LABEL = "longlink.io/organization-id"
ENVIRONMENT_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


@dataclass(frozen=True, slots=True)
class OrganizationManifests:
    """Hold one organization Namespace and its ingress policy."""

    namespace: KubernetesDocument
    network_policy: KubernetesDocument


@dataclass(frozen=True, slots=True)
class ApplicationManifests:
    """Hold one application's exact Secret and applied workload resources."""

    secret: KubernetesDocument
    deployment: KubernetesDocument
    service: KubernetesDocument


class Applications:
    """Render application resources and expose read-only workload diagnostics."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize diagnostics against shared cluster resources."""

        self._resources = resources

    def organization_manifests(
        self,
        organization: DesiredOrganization,
        location_id: str,
        platform_version: str,
    ) -> OrganizationManifests:
        """Render an owned organization Namespace and gateway ingress policy."""

        # Include template source and identity in the revision applied to both resources.
        source = TEMPLATES.joinpath("application_network_policy.yml")
        revision_input = json.dumps(
            {"id": str(organization.id), "slug": organization.slug},
            sort_keys=True,
            separators=(",", ":"),
        )
        runtime_revision = hashlib.sha256(f"{source.read_text(encoding='utf-8')}\n{revision_input}".encode()).hexdigest()
        manifests = templates.readyml_list(
            source,
            location_id=location_id,
            namespace=organization.slug,
            organization_id=str(organization.id),
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )

        # A partial or reordered template must fail before any resource is applied.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Namespace", "NetworkPolicy"):
            raise ValueError("Organization template resources are incomplete or out of order")
        return OrganizationManifests(namespace=manifests[0], network_policy=manifests[1])

    def manifests(
        self,
        application: DesiredApplication,
        location_id: str,
        revision_key: str,
        platform_version: str,
    ) -> ApplicationManifests:
        """Render one desired application Secret, Deployment, and Service."""

        # Hash the source and complete runtime input so image and Secret changes roll the pods.
        source = TEMPLATES.joinpath("application.yml")
        revision_input = json.dumps(
            {
                "envs": dict(sorted(application.envs.items())),
                "id": str(application.id),
                "image": application.image,
                "namespace": application.namespace,
                "organization_id": str(application.organization_id),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        runtime_revision = hmac.new(
            revision_key.encode("utf-8"),
            f"{source.read_text(encoding='utf-8')}\n{revision_input}".encode(),
            hashlib.sha256,
        ).hexdigest()
        application_id = str(application.id)
        labels = {
            "app": application_id,
            "app.kubernetes.io/managed-by": "longlink-platform",
            "compute-role": "application",
            APPLICATION_ID_LABEL: application_id,
            "longlink.io/location-id": location_id,
            ORGANIZATION_ID_LABEL: str(application.organization_id),
        }
        annotations = {
            "longlink.io/platform-version": platform_version,
            "longlink.io/runtime-revision": runtime_revision,
            "longlink.io/template-revision": TEMPLATE_REVISION,
        }
        secret: KubernetesDocument = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": application_id,
                "namespace": application.namespace,
                "annotations": annotations,
                "labels": labels,
            },
            "type": "Opaque",
            "stringData": dict(sorted(application.envs.items())),
        }
        manifests = templates.readyml_list(
            source,
            application_id=application_id,
            image=json.dumps(application.image),
            location_id=location_id,
            namespace=application.namespace,
            organization_id=str(application.organization_id),
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )

        # Deployment and Service order is fixed for the reconciliation apply phase.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Deployment", "Service"):
            raise ValueError("Application template resources are incomplete or out of order")
        return ApplicationManifests(secret=secret, deployment=manifests[0], service=manifests[1])

    async def pod(self, application_id: str) -> Pod | None:
        """Return one current pod for a managed application, if present."""

        pods = await self._resources.list(Pod, kr8s.ALL, {APPLICATION_ID_LABEL: application_id})
        return pods[0] if pods else None

    async def ready(self, application_id: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        deployments = await self._resources.list(Deployment, kr8s.ALL, {APPLICATION_ID_LABEL: application_id})

        # A missing Deployment is a normal pending diagnostic state.
        if not deployments:
            return False

        # Readiness requires the controller to observe and fully update the desired single replica.
        deployment = deployments[0]
        if deployment.metadata is None or deployment.status is None:
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

    async def logs(self, application_id: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed application."""

        pod = await self.pod(application_id)

        # A missing pod has no diagnostic log stream.
        if pod is None:
            raise ValueError("No application pod found")
        return [line async for line in pod.logs(tail_lines=lines)]

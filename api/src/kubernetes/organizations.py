import json
import time
import asyncio
import hashlib
from uuid import UUID
from src.utils import names, templates
from dataclasses import dataclass
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy
from src.kubernetes.resources import ResourceScope, KubernetesDocument, KubernetesResources
from src.kubernetes.applications import ORGANIZATION_ID_LABEL

APPLICATION_TEMPLATES = files("src.kubernetes.templates").joinpath("application")
TEMPLATE_REVISION = "2026-07-26.1"
NETWORK_POLICY_NAME = "longlink-gateway-ingress"
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2


@dataclass(frozen=True, slots=True)
class DesiredOrganization:
    """Describe one Organization boundary for its explicit lifecycle action."""

    id: UUID
    slug: str


@dataclass(frozen=True, slots=True)
class OrganizationManifests:
    """Hold one Organization Namespace and its gateway ingress policy."""

    namespace: KubernetesDocument
    network_policy: KubernetesDocument


class Organizations:
    """Manage explicit Organization Namespace creation and deletion."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize Organization lifecycle access through shared cluster resources."""

        self._resources = resources

    def manifests(self, organization: DesiredOrganization, compute_id: str) -> OrganizationManifests:
        """Render one Organization Namespace and gateway-only ingress policy."""

        # Include template source and identity in the revision applied once to both resources.
        names.knames(organization.slug)
        source = APPLICATION_TEMPLATES.joinpath("organization.yml")
        revision_input = json.dumps(
            {"id": str(organization.id), "slug": organization.slug},
            sort_keys=True,
            separators=(",", ":"),
        )
        runtime_revision = hashlib.sha256(f"{source.read_text(encoding='utf-8')}\n{revision_input}".encode()).hexdigest()
        manifests = templates.readyml_list(
            source,
            compute_id=compute_id,
            namespace=organization.slug,
            organization_id=str(organization.id),
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )

        # A partial or reordered template must fail before any resource is applied.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Namespace", "NetworkPolicy"):
            raise ValueError("Organization template resources are incomplete or out of order")
        return OrganizationManifests(namespace=manifests[0], network_policy=manifests[1])

    async def apply(self, organization: DesiredOrganization, compute_id: str) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Apply only the requested Organization and never inspect unrelated Namespaces.
        manifests = self.manifests(organization, compute_id)
        namespace = await self._resources.apply(manifests.namespace)
        if not isinstance(namespace, Namespace):
            raise TypeError("Kubernetes Namespace apply returned an unexpected resource kind")
        await self._resources.apply(manifests.network_policy)

    async def delete(self, organization: DesiredOrganization, compute_id: str) -> None:
        """Delete one exact Organization boundary after its Applications are gone."""

        # Identity checks prevent a reused Namespace slug from being deleted as the old Organization.
        names.knames(organization.slug)
        labels = {ORGANIZATION_ID_LABEL: str(organization.id)}
        await self._resources.delete_owned(
            NetworkPolicy,
            NETWORK_POLICY_NAME,
            compute_id,
            ResourceScope.application,
            organization.slug,
            labels,
        )
        await self._resources.delete_owned(
            Namespace,
            organization.slug,
            compute_id,
            ResourceScope.application,
            labels=labels,
        )

        # Namespace finalizers must finish before provider and database state can be purged.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, organization.slug) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Organization Namespace {organization.slug!r} did not terminate")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

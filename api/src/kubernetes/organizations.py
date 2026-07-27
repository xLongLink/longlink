import time
import asyncio
from src.utils import templates
from dataclasses import dataclass
from importlib.resources import files
from kr8s.asyncio.objects import Namespace
from src.kubernetes.resources import KubernetesDocument, KubernetesResources

RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2


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

    def manifests(self, namespace: str) -> OrganizationManifests:
        """Render one Organization Namespace and gateway-only ingress policy."""

        # Render the Organization resources from its persisted Namespace identity.
        manifests = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "organization.yml"),
            namespace=namespace,
        )
        return OrganizationManifests(namespace=manifests[0], network_policy=manifests[1])

    async def apply(self, namespace: str) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Apply only the requested Organization and never inspect unrelated Namespaces.
        manifests = self.manifests(namespace)
        await self._resources.apply(manifests.namespace)
        await self._resources.apply(manifests.network_policy)

    async def delete(self, namespace: str) -> None:
        """Delete one exact Organization boundary after its Applications are gone."""

        # Namespace deletion cascades to its namespaced Organization resources.
        await self._resources.delete(
            Namespace,
            namespace,
        )

        # Namespace finalizers must finish before provider and database state can be purged.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Organization Namespace {namespace!r} did not terminate")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

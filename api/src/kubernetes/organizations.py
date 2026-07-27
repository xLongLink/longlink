from src.utils import templates
from dataclasses import dataclass
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy
from src.kubernetes.resources import KubernetesDocument, KubernetesResources


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
        await self._resources.apply(Namespace, manifests.namespace)
        await self._resources.apply(NetworkPolicy, manifests.network_policy)

    async def delete(self, namespace: str) -> bool:
        """Request Organization Namespace deletion and return whether cleanup is complete."""

        # A missing Namespace means Organization cleanup already completed.
        resource = await self._resources.read(Namespace, namespace)
        if resource is None:
            return True

        # Issue deletion once while later operation attempts observe provider finalizer progress.
        metadata = resource.raw.get("metadata")
        if not isinstance(metadata, dict):
            raise TypeError("Organization Namespace response must include metadata")
        if metadata.get("deletionTimestamp") is None:
            await self._resources.delete(Namespace, namespace)
        return False

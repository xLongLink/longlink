import time
import asyncio
from src.utils import names, templates
from dataclasses import dataclass
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy
from src.kubernetes.resources import KubernetesDocument, KubernetesResources

NETWORK_POLICY_NAME = "longlink-gateway-ingress"
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

        # Validate the Namespace identity before rendering either Organization resource.
        names.knames(namespace)
        manifests = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "organization.yml"),
            namespace=namespace,
        )

        # A partial or reordered template must fail before any resource is applied.
        if tuple(manifest.get("kind") for manifest in manifests) != ("Namespace", "NetworkPolicy"):
            raise ValueError("Organization template resources are incomplete or out of order")
        return OrganizationManifests(namespace=manifests[0], network_policy=manifests[1])

    async def apply(self, namespace: str) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Apply only the requested Organization and never inspect unrelated Namespaces.
        manifests = self.manifests(namespace)
        applied = await self._resources.apply_application(manifests.namespace)
        if not isinstance(applied, Namespace):
            raise TypeError("Kubernetes Namespace apply returned an unexpected resource kind")
        await self._resources.apply_application(manifests.network_policy)

    async def delete(self, namespace: str) -> None:
        """Delete one exact Organization boundary after its Applications are gone."""

        # Validate the exact Namespace before deleting its lifecycle resources.
        names.knames(namespace)
        await self._resources.delete_application(
            NetworkPolicy,
            NETWORK_POLICY_NAME,
            namespace,
        )
        await self._resources.delete_application(
            Namespace,
            namespace,
        )

        # Namespace finalizers must finish before provider and database state can be purged.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Organization Namespace {namespace!r} did not terminate")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

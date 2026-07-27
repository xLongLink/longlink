import asyncio
from src.utils import templates
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy
from src.kubernetes.resources import KubernetesResources


class Organizations:
    """Manage explicit Organization Namespace creation and deletion."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize Organization lifecycle access through shared cluster resources."""

        self._resources = resources

    async def apply(self, namespace: str) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Render and apply only the requested Organization boundary.
        namespace_manifest, network_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "organization.yml"),
            namespace=namespace,
        )
        await self._resources.apply(Namespace, namespace_manifest)
        await self._resources.apply(NetworkPolicy, network_policy)

    async def delete(self, namespace: str) -> None:
        """Delete one Organization Namespace and wait for completion."""

        # Issue deletion once and then poll only the Namespace state.
        while (resource := await self._resources.read(Namespace, namespace)) is not None:
            if resource.metadata.get("deletionTimestamp") is None:
                await self._resources.delete(Namespace, namespace)
            await asyncio.sleep(5)

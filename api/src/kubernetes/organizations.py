import asyncio
from typing import TYPE_CHECKING
from src.utils import templates
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy, ResourceQuota
from src.kubernetes.utils import apply

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


class Organizations:
    """Manage explicit Organization Namespace creation and deletion."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Organization lifecycle access through shared cluster resources."""

        self._client = client

    async def apply(self, namespace: str) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Render and apply only the requested Organization boundary.
        namespace_manifest, resource_quota, network_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("solution", "organization.yml"),
            namespace=namespace,
        )

        api = await self._client.api()
        await apply(Namespace(namespace_manifest, api=api))
        await apply(ResourceQuota(resource_quota, api=api))
        await apply(NetworkPolicy(network_policy, api=api))

    async def delete(self, namespace: str) -> None:
        """Delete one Organization Namespace and wait for completion."""

        # Issue deletion once and then poll only the Namespace state.
        resource = Namespace(namespace, api=await self._client.api())
        while await resource.exists():
            await resource.refresh()
            if resource.metadata.get("deletionTimestamp") is None:
                await resource.delete()
            await asyncio.sleep(5)

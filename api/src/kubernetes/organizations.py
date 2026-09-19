from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from src.kubernetes import utils, namespace
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


class Organizations:
    """Reconcile and delete one Organization compute Namespace boundary."""

    def __init__(self, client: "Kubernetes") -> None:
        """Share the Compute Kubernetes connection."""

        self._client = client

    async def apply(self, organization_id: UUID) -> None:
        """Create one Organization Namespace boundary for its explicit lifecycle."""

        # Render and apply only the requested Organization boundary.
        compute_namespace = namespace.compute(organization_id)
        namespace_manifest, network_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("solution", "organization.yml"),
            namespace=compute_namespace,
        )

        api = await self._client.api()
        await utils.apply(Namespace(namespace_manifest, api=api))
        await utils.apply(NetworkPolicy(network_policy, api=api))

    async def delete(self, organization_id: UUID) -> None:
        """Delete one Organization Namespace and wait for completion."""

        # Namespace termination is the completion boundary for compute cleanup.
        await utils.delete_namespace(await self._client.api(), namespace.compute(organization_id))

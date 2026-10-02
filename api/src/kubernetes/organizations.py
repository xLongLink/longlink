from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from src.kubernetes import utils, namespace
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


async def apply(client: "Kubernetes", organization_id: UUID) -> None:
    """Create one Organization Namespace boundary for its explicit lifecycle."""

    # Render and apply only the requested Organization boundary.
    compute_namespace = namespace.compute(organization_id)
    namespace_manifest, network_policy = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "organization.yml"),
        namespace=compute_namespace,
    )

    # Apply the Namespace before its policy through the lifecycle owner's connection.
    api = await client.api()
    compute_boundary = Namespace(namespace_manifest, api=api)
    await utils.apply(compute_boundary)
    boundary_policy = NetworkPolicy(network_policy, api=api)
    await utils.apply(boundary_policy)


async def delete(client: "Kubernetes", organization_id: UUID) -> None:
    """Delete one Organization Namespace and wait for completion."""

    # Namespace termination is the completion boundary for compute cleanup.
    await utils.delete_namespace(await client.api(), namespace.compute(organization_id))

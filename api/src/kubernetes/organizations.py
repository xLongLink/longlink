from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from src.kubernetes import utils, namespace
from importlib.resources import files
from kr8s.asyncio.objects import Namespace, NetworkPolicy, ResourceQuota

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


async def apply(client: "Kubernetes", organization_id: UUID) -> None:
    """Create one Organization Namespace boundary for its explicit lifecycle."""

    # Render and apply only the requested Organization boundary.
    compute_namespace = namespace.compute(organization_id)
    namespace_manifest, resource_quota, network_policy = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "organization.yml"),
        namespace=compute_namespace,
    )

    api = await client.api()
    await utils.apply(Namespace(namespace_manifest, api=api))
    await utils.apply(ResourceQuota(resource_quota, api=api))
    await utils.apply(NetworkPolicy(network_policy, api=api))

async def delete(client: "Kubernetes", organization_id: UUID) -> None:
    """Delete one Organization Namespace and wait for completion."""

    # Issue deletion once and wait for Kubernetes to report terminal absence.
    resource = Namespace(namespace.compute(organization_id), api=await client.api())
    try:
        await resource.delete()
    except NotFoundError:
        return

    await resource.wait("delete")

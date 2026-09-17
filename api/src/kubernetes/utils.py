import asyncio
from kr8s import NotFoundError
from kr8s.asyncio import Api
from kr8s.asyncio.objects import APIObject, Namespace


async def apply(resource: APIObject) -> None:
    """Create or patch one Kubernetes resource to its desired manifest."""

    # Patch the common existing-resource path without a separate presence query.
    try:
        await resource.patch(resource.raw)
    except NotFoundError:
        await resource.create()


async def delete_namespace(api: Api, name: str, timeout_seconds: float = 600) -> None:
    """Delete one Namespace and wait until Kubernetes reports its absence."""

    # Issue deletion once and wait for Kubernetes to report terminal absence.
    resource = Namespace(name, api=api)
    try:
        await resource.delete()
    except NotFoundError:
        return
    async with asyncio.timeout(timeout_seconds):
        await resource.wait("delete")

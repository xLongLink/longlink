import asyncio
from kr8s import NotFoundError
from decimal import Decimal
from kr8s.asyncio import Api
from kr8s.asyncio.objects import APIObject, Namespace


def quantity(value: str | int) -> Decimal:
    """Read Kubernetes decimal and binary resource quantities."""

    # Kubernetes quantities use decimal exponents or a fixed unit suffix.
    text = str(value)
    for suffix, multiplier in (
        ("Ki", 1024),
        ("Mi", 1024**2),
        ("Gi", 1024**3),
        ("Ti", 1024**4),
        ("Pi", 1024**5),
        ("Ei", 1024**6),
        ("n", Decimal("1e-9")),
        ("u", Decimal("1e-6")),
        ("m", Decimal("1e-3")),
        ("k", 1000),
        ("K", 1000),
        ("M", 1000**2),
        ("G", 1000**3),
        ("T", 1000**4),
        ("P", 1000**5),
        ("E", 1000**6),
    ):
        if text.endswith(suffix):
            return Decimal(text.removesuffix(suffix)) * multiplier
    return Decimal(text)


async def apply(resource: APIObject) -> None:
    """Create or patch one Kubernetes resource to its desired manifest."""

    # Patch the common existing-resource path without a separate presence query.
    try:
        await resource.patch(resource.raw)
    except NotFoundError:
        await resource.create()


async def delete_namespace(api: Api, name: str) -> None:
    """Delete one Namespace and wait until Kubernetes reports its absence."""

    # Issue deletion once and wait for Kubernetes to report terminal absence.
    resource = Namespace(name, api=api)
    try:
        await resource.delete()
    except NotFoundError:
        return

    # Deletion acknowledgement does not imply the resource is already gone.
    async with asyncio.timeout(600):
        await resource.wait("delete")

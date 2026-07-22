import aioboto3
import urllib.parse
from typing import TYPE_CHECKING, TypedDict, cast
from contextlib import AbstractAsyncContextManager
from src.environments import env
from src.models.infrastructure import exoscale_zone
from src.database.models.storages import StorageRegistry

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client


class StorageUsage(TypedDict):
    """Describe aggregate storage usage for one bucket prefix."""

    space_used: int
    object_count: int


def client(registry: StorageRegistry) -> "AbstractAsyncContextManager[S3Client]":
    """Create an async S3 client context manager for one storage registry."""

    # Derive TLS behavior from the endpoint URL so registry data has one source of truth.
    parsed_url = urllib.parse.urlsplit(registry.endpoint_url)
    if parsed_url.scheme not in {"http", "https"}:
        raise ValueError("Storage endpoint URL must use http or https")

    # Resolve Exoscale credentials from their authoritative control-plane boundary.
    region = exoscale_zone(registry.endpoint_url)
    access_key_id, secret_access_key, _organization_id = env.exoscale()

    return cast(
        "AbstractAsyncContextManager[S3Client]",
        aioboto3.Session().client(
            "s3",
            use_ssl=parsed_url.scheme == "https",
            endpoint_url=registry.endpoint_url,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        ),
    )


async def buckets(registry: StorageRegistry) -> list[str]:
    """List buckets on one storage registry."""

    # Use one client for the bucket listing request.
    async with client(registry) as s3:
        response = await s3.list_buckets()

    return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]


async def usage(registry: StorageRegistry, bucket_name: str, prefix: str) -> StorageUsage:
    """Return aggregate usage details for one bucket prefix."""

    object_count = 0
    space_used = 0

    # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
    async with client(registry) as s3:
        paginator = s3.get_paginator("list_objects_v2")
        async for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
            contents = page.get("Contents", [])
            object_count += len(contents)
            space_used += sum(int(item.get("Size", 0)) for item in contents)

    return {"object_count": object_count, "space_used": space_used}

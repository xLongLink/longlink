import aioboto3
import urllib.parse
from typing import TYPE_CHECKING, TypedDict, cast
from contextlib import AbstractAsyncContextManager
from src.database.models.storages import StorageRegistry

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client


class StorageObjectData(TypedDict):
    """Describe one object stored in a bucket."""

    key: str
    size: int
    etag: str | None


class StorageBucketUsage(TypedDict):
    """Describe aggregate storage usage for one bucket."""

    space_used: int
    object_count: int


def client(registry: StorageRegistry) -> AbstractAsyncContextManager[S3Client]:
    """Create an async S3 client context manager for one storage registry."""

    # Derive TLS behavior from the endpoint URL so registry data has one source of truth.
    parsed_url = urllib.parse.urlsplit(registry.endpoint_url)
    if parsed_url.scheme not in {"http", "https"}:
        raise ValueError("Storage endpoint URL must use http or https")

    return cast(
        "AbstractAsyncContextManager[S3Client]",
        aioboto3.Session().client(
            "s3",
            use_ssl=parsed_url.scheme == "https",
            endpoint_url=registry.endpoint_url,
            aws_access_key_id=registry.access_key_id,
            aws_secret_access_key=registry.secret_access_key,
        ),
    )


async def buckets(registry: StorageRegistry) -> list[str]:
    """List buckets on one storage registry."""

    # Use one client for the bucket listing request.
    async with client(registry) as s3:
        response = await s3.list_buckets()

    return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]


async def objects(registry: StorageRegistry, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
    """List object metadata for one bucket."""

    rows: list[StorageObjectData] = []

    # Use one client for paginated object listing.
    async with client(registry) as s3:
        paginator = s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(
            Bucket=bucket_name,
            PaginationConfig={
                "MaxItems": limit,
                "PageSize": min(1000, limit),
            },
        )

        # The paginator owns continuation tokens; keep only the response normalization here.
        async for page in pages:
            # Normalize each object entry from the current page.
            for item in page.get("Contents", []):
                # Ignore entries that do not include object keys.
                key = item.get("Key")
                if key is None:
                    continue

                etag = item.get("ETag")
                rows.append(
                    cast(
                        StorageObjectData,
                        {
                            "key": str(key),
                            "size": int(item.get("Size", 0)),
                            "etag": str(etag) if etag is not None else None,
                        },
                    )
                )

    return rows


async def usage(registry: StorageRegistry, bucket_name: str) -> StorageBucketUsage:
    """Return aggregate usage details for one bucket."""

    object_count = 0
    space_used = 0

    # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
    async with client(registry) as s3:
        paginator = s3.get_paginator("list_objects_v2")
        async for page in paginator.paginate(Bucket=bucket_name):
            contents = page.get("Contents", [])
            object_count += len(contents)
            space_used += sum(int(item.get("Size", 0)) for item in contents)

    return cast(StorageBucketUsage, {"object_count": object_count, "space_used": space_used})

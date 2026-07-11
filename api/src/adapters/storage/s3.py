import aioboto3
import urllib.parse
from .base import Storage, StorageObjectData, StorageBucketUsage
from typing import TYPE_CHECKING, cast
from contextlib import AbstractAsyncContextManager

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


class S3(Storage):
    """S3-compatible storage adapter."""

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
        """Initialize the storage adapter."""

        # Derive TLS behavior from the endpoint URL so registry data has one source of truth.
        parsed_url = urllib.parse.urlsplit(endpoint_url)
        if parsed_url.scheme not in {"http", "https"}:
            raise ValueError("Storage endpoint URL must use http or https")

        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._use_ssl = parsed_url.scheme == "https"
        self._session = aioboto3.Session()

    def _client(
        self,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
    ) -> AbstractAsyncContextManager[S3Client]:
        """Create an async S3 client context manager for one credential pair."""

        return cast(
            "AbstractAsyncContextManager[S3Client]",
            self._session.client(
                "s3",
                use_ssl=self._use_ssl,
                endpoint_url=self._endpoint_url,
                aws_access_key_id=access_key_id if access_key_id is not None else self._access_key_id,
                aws_secret_access_key=secret_access_key if secret_access_key is not None else self._secret_access_key,
            ),
        )

    async def buckets(self) -> list[str]:
        """List storage buckets."""

        # Use one client for the bucket listing request.
        async with self._client() as client:
            response = await client.list_buckets()

        return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]

    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

        objects: list[StorageObjectData] = []

        # Use one client for paginated object listing.
        async with self._client() as client:
            paginator = client.get_paginator("list_objects_v2")
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
                    objects.append(
                        {
                            "key": str(key),
                            "size": int(item.get("Size", 0)),
                            "etag": str(etag) if etag is not None else None,
                        }
                    )

        return objects

    async def bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate usage details for one S3 bucket."""

        object_count = 0
        space_used = 0

        # Use one client for paginated usage scanning.
        async with self._client() as client:
            paginator = client.get_paginator("list_objects_v2")

            # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
            async for page in paginator.paginate(Bucket=bucket_name):
                contents = page.get("Contents", [])
                object_count += len(contents)
                space_used += sum(int(item.get("Size", 0)) for item in contents)

        return {"object_count": object_count, "space_used": space_used}

    async def delete_bucket(self, bucket_name: str) -> None:
        """Delete one S3 bucket and all listed objects."""

        # Keep bucket cleanup in one client session.
        async with self._client() as client:
            paginator = client.get_paginator("list_objects_v2")

            # Delete objects page by page before removing the bucket.
            async for page in paginator.paginate(Bucket=bucket_name):
                objects: list[ObjectIdentifierTypeDef] = [{"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item]

                # Skip empty pages from compatible storage backends.
                if objects:
                    await client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})

            await client.delete_bucket(Bucket=bucket_name)

    async def bucket(self, bucket_name: str) -> str:
        """Create one assigned bucket and return its name."""

        # Use the provisioning client to create the bucket.
        async with self._client() as client:
            await client.create_bucket(Bucket=bucket_name)

        return bucket_name

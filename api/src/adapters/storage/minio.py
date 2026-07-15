import aioboto3
import urllib.parse
from .base import Storage, StorageAccess, StorageRuntimeCredentials
from typing import TYPE_CHECKING, cast
from contextlib import AbstractAsyncContextManager
from botocore.exceptions import ClientError

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


class MinIO(Storage):
    """Provide the development-only S3-compatible storage adapter.

    It intentionally reuses registry credentials for runtimes and does not provide production tenant credential isolation.
    """

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

    async def delete(self, bucket: str) -> None:
        """Delete one MinIO bucket and all listed objects."""

        # Keep bucket cleanup in one client session.
        async with self._client() as client:
            try:
                paginator = client.get_paginator("list_objects_v2")

                # Delete objects page by page before removing the bucket.
                async for page in paginator.paginate(Bucket=bucket):
                    objects: list[ObjectIdentifierTypeDef] = [
                        {"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item
                    ]

                    # Skip empty pages from compatible storage backends.
                    if objects:
                        await client.delete_objects(Bucket=bucket, Delete={"Objects": objects})

                await client.delete_bucket(Bucket=bucket)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") not in {"NoSuchBucket", "NoSuchKey", "404"}:
                    raise

    async def create(self, bucket: str) -> str:
        """Create one assigned bucket and return its name."""

        # Use the provisioning client to create the bucket.
        async with self._client() as client:
            try:
                await client.create_bucket(Bucket=bucket)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") != "BucketAlreadyOwnedByYou":
                    raise

        return bucket

    async def credentials(self, bucket: str, access: StorageAccess) -> StorageRuntimeCredentials:
        """Return shared development credentials regardless of the requested bucket access level.

        This local-only shortcut is not a least-privilege production contract.
        """

        # Local MinIO uses the development root credentials until local policy management is needed.
        return {
            "access_key_id": self._access_key_id,
            "secret_access_key": self._secret_access_key,
        }

    async def revoke(self, bucket: str) -> None:
        """Ignore local runtime credential revocation."""

        # Local MinIO credentials are shared development credentials and are not application-scoped.

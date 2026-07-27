import aioboto3
import urllib.parse
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, TypedDict, cast
from contextlib import AbstractAsyncContextManager
from botocore.exceptions import ClientError

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


class StorageRuntimeCredentials(TypedDict):
    """Describe access keys injected into one application runtime.

    Production providers must scope them to the assigned Organization bucket and Application prefixes.
    """

    access_key_id: str
    secret_access_key: str


class StorageUsage(TypedDict):
    """Describe aggregate storage usage for one bucket prefix."""

    space_used: int
    object_count: int


class Storage(ABC):
    """Provide shared S3 lifecycle behavior and define the provider credential contract.

    Provisioning uses registry authority, while production runtimes receive bucket-and-prefix-scoped least-privilege keys.
    """

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str, region: str | None = None) -> None:
        """Initialize the S3-compatible storage client."""

        # Derive TLS behavior from the endpoint URL so registry data has one source of truth.
        parsed_url = urllib.parse.urlsplit(endpoint_url)
        if parsed_url.scheme not in {"http", "https"}:
            raise ValueError("Storage endpoint URL must use http or https")

        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._use_ssl = parsed_url.scheme == "https"
        self._region = region
        self._session = aioboto3.Session()

    def _client(self) -> "AbstractAsyncContextManager[S3Client]":
        """Create an async S3 client context manager with the registry credentials."""

        return cast(
            "AbstractAsyncContextManager[S3Client]",
            self._session.client(
                "s3",
                use_ssl=self._use_ssl,
                endpoint_url=self._endpoint_url,
                region_name=self._region,
                aws_access_key_id=self._access_key_id,
                aws_secret_access_key=self._secret_access_key,
            ),
        )

    async def buckets(self) -> list[str]:
        """List bucket names available to the registry credentials."""

        # Use one client for the bucket listing request.
        async with self._client() as client:
            response = await client.list_buckets()

        return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]

    async def usage(self, bucket: str, prefix: str) -> StorageUsage:
        """Return aggregate usage details for one bucket prefix."""

        object_count = 0
        space_used = 0

        # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
        async with self._client() as client:
            paginator = client.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                contents = [item for item in page.get("Contents", []) if item.get("Key") != prefix or int(item.get("Size", 0)) != 0]
                object_count += len(contents)
                space_used += sum(int(item.get("Size", 0)) for item in contents)

        return {"object_count": object_count, "space_used": space_used}

    async def create(self, bucket: str) -> str:
        """Create one S3-compatible bucket and return its name."""

        # Use the provisioning client to create the bucket.
        async with self._client() as client:
            try:
                await client.create_bucket(Bucket=bucket)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") != "BucketAlreadyOwnedByYou":
                    raise

        return bucket

    async def create_prefix(self, bucket: str, prefix: str) -> None:
        """Create one S3-compatible prefix marker without replacing an existing object."""

        # Conditional creation preserves existing data and avoids new versions during reconciliation.
        async with self._client() as client:
            try:
                await client.put_object(Bucket=bucket, Key=prefix, Body=b"", IfNoneMatch="*")
            except ClientError as exc:
                error = exc.response.get("Error", {})
                status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
                if error.get("Code") not in {"PreconditionFailed", "412"} and status != 412:
                    raise

    async def delete(self, bucket: str) -> None:
        """Delete one S3-compatible bucket and all listed objects."""

        # Empty the bucket before removing the bucket resource itself.
        await self.delete_prefix(bucket, "")

        # Delete the empty bucket while tolerating already-absent provider state.
        async with self._client() as client:
            try:
                await client.delete_bucket(Bucket=bucket)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") not in {"NoSuchBucket", "NoSuchKey", "404"}:
                    raise

    async def delete_prefix(self, bucket: str, prefix: str) -> None:
        """Delete every object, version, delete marker, and multipart upload under one prefix."""

        # Abort incomplete uploads before deleting stored data under the same prefix.
        async with self._client() as client:
            try:
                while True:
                    page = await client.list_multipart_uploads(Bucket=bucket, Prefix=prefix)
                    uploads = [
                        (str(item["Key"]), str(item["UploadId"]))
                        for item in page.get("Uploads", [])
                        if "Key" in item and "UploadId" in item
                    ]
                    if not uploads:
                        break
                    for key, upload_id in uploads:
                        try:
                            await client.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                        except ClientError as exc:
                            error = exc.response.get("Error", {})
                            if error.get("Code") != "NoSuchUpload":
                                raise

                # Delete current objects in bounded batches without touching sibling prefixes.
                while True:
                    page = await client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1000)
                    objects: list[ObjectIdentifierTypeDef] = [
                        {"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item
                    ]
                    if not objects:
                        break
                    await self._delete_objects(client, bucket, objects)

                # Remove every version and delete marker so versioned buckets can become empty.
                while True:
                    page = await client.list_object_versions(Bucket=bucket, Prefix=prefix, MaxKeys=1000)
                    objects = [
                        {"Key": str(item["Key"]), "VersionId": str(item["VersionId"])}
                        for item in [*page.get("Versions", []), *page.get("DeleteMarkers", [])]
                        if "Key" in item and "VersionId" in item
                    ]
                    if not objects:
                        break
                    await self._delete_objects(client, bucket, objects)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") not in {"NoSuchBucket", "NoSuchKey", "404"}:
                    raise

    async def _delete_objects(self, client: "S3Client", bucket: str, objects: "list[ObjectIdentifierTypeDef]") -> None:
        """Delete one object batch and reject S3's successful response when individual deletions failed."""

        # Bulk deletes report per-object failures in a successful HTTP response.
        response = await client.delete_objects(Bucket=bucket, Delete={"Objects": objects, "Quiet": True})
        errors = response.get("Errors", [])
        if errors:
            details = ", ".join(f"{item.get('Key', '<unknown>')}: {item.get('Code', 'unknown error')}" for item in errors)
            raise RuntimeError(f"S3 object deletion failed for {details}")

    @abstractmethod
    async def credentials(self, name: str, bucket: str, read_prefixes: tuple[str, ...], write_prefix: str) -> StorageRuntimeCredentials:
        """Converge and return runtime credentials for one Application's storage prefixes.

        Implementations must converge after partial prior attempts so retries do not accumulate active credentials.
        """
        raise NotImplementedError

    @abstractmethod
    async def revoke(self, name: str) -> None:
        """Revoke one Application's runtime credentials and tolerate already-absent provider state.

        The operation must be safe to retry during cleanup.
        """
        raise NotImplementedError

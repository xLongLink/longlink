from __future__ import annotations

import os
import secrets
import aioboto3
from .base import Storage, StorageObjectData, StorageBucketUsage, StorageRuntimeCredentials
from typing import TYPE_CHECKING, cast
from datetime import datetime
from contextlib import AbstractAsyncContextManager, suppress
from src.environments import env
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import GetObjectOutputTypeDef, ObjectIdentifierTypeDef


class S3(Storage):
    """S3-compatible storage adapter."""

    _ACCESS_DENIED_CODES = {"403", "AccessDenied", "AllAccessDisabled"}
    _BUCKET_EXISTS_CODES = {"BucketAlreadyExists", "BucketAlreadyOwnedByYou"}
    _MISSING_BUCKET_CODES = {"404", "NoSuchBucket", "NotFound"}
    _MISSING_OBJECT_CODES = {"404", "NoSuchKey", "NotFound"}

    def __init__(
        self,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        """Initialize the storage adapter."""
        self._protocol = protocol
        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
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
                use_ssl=self._protocol == "https",
                endpoint_url=self._endpoint_url,
                aws_access_key_id=access_key_id if access_key_id is not None else self._access_key_id,
                aws_secret_access_key=secret_access_key if secret_access_key is not None else self._secret_access_key,
            ),
        )

    @staticmethod
    def _error_code(exc: ClientError) -> str:
        """Return the normalized S3 error code from one client error."""

        return str(exc.response.get("Error", {}).get("Code", ""))

    def _is_access_denied(self, exc: ClientError) -> bool:
        """Return whether an S3 client error represents denied access."""

        return self._error_code(exc) in self._ACCESS_DENIED_CODES

    def _is_missing_object(self, exc: ClientError) -> bool:
        """Return whether an S3 client error proves object read access for a missing key."""

        return self._error_code(exc) in self._MISSING_OBJECT_CODES

    async def _drain_object_body(self, response: GetObjectOutputTypeDef) -> None:
        """Drain an S3 object response so the async connection can be reused."""

        await response["Body"].read()

    async def buckets(self) -> list[str]:
        """List storage buckets."""

        async with self._client() as client:
            response = await client.list_buckets()

        return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]

    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

        if limit <= 0:
            return []

        objects: list[StorageObjectData] = []
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
                for item in page.get("Contents", []):
                    key = item.get("Key")
                    if key is None:
                        continue

                    etag = item.get("ETag")
                    last_modified = item.get("LastModified")
                    objects.append(
                        {
                            "key": str(key),
                            "size": int(item.get("Size", 0)),
                            "etag": str(etag) if etag is not None else None,
                            "last_modified": last_modified if isinstance(last_modified, datetime) else None,
                        }
                    )

        return objects

    async def bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate usage details for one S3 bucket."""

        object_count = 0
        space_used = 0
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

        async with self._client() as client:
            try:
                await client.head_bucket(Bucket=bucket_name)
            except ClientError as exc:
                if self._error_code(exc) in self._MISSING_BUCKET_CODES:
                    return
                raise

            paginator = client.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=bucket_name):
                objects: list[ObjectIdentifierTypeDef] = [
                    {"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item
                ]
                if objects:
                    await client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})

            await client.delete_bucket(Bucket=bucket_name)

    async def application_credentials(
        self,
        application_bucket: str,
        shared_bucket: str,
        other_application_buckets: list[str],
    ) -> StorageRuntimeCredentials:
        """Return validated runtime credentials for one application."""

        credentials: StorageRuntimeCredentials = {
            "access_key_id": self._access_key_id,
            "secret_access_key": self._secret_access_key,
        }
        # Local MinIO uses one admin key for provisioning and runtime during seed/dev flows.
        if env.DEVELOPMENT and os.getenv("ENVIRONMENT", "").strip().lower() != "testing":
            return credentials

        check_key = f".longlink/access-check-{secrets.token_urlsafe(8)}"

        async with self._client(credentials["access_key_id"], credentials["secret_access_key"]) as runtime_client:
            # Prove the runtime can read and write its own application bucket.
            application_check_created = False
            try:
                await runtime_client.put_object(Bucket=application_bucket, Key=check_key, Body=b"")
                application_check_created = True
                response = await runtime_client.get_object(Bucket=application_bucket, Key=check_key)
                await self._drain_object_body(response)
                await runtime_client.delete_object(Bucket=application_bucket, Key=check_key)
                application_check_created = False
            except ClientError as exc:
                if application_check_created:
                    with suppress(ClientError):
                        await runtime_client.delete_object(Bucket=application_bucket, Key=check_key)

                raise ValueError("Storage runtime credentials need read/write access to the application bucket") from exc

            # Prove the runtime can list and read shared organization storage but cannot write it.
            try:
                await runtime_client.list_objects_v2(Bucket=shared_bucket, MaxKeys=1)
                response = await runtime_client.get_object(Bucket=shared_bucket, Key=check_key)
                await self._drain_object_body(response)
            except ClientError as exc:
                if not self._is_missing_object(exc):
                    raise ValueError("Storage runtime credentials need read access to the shared bucket") from exc

            try:
                await runtime_client.put_object(Bucket=shared_bucket, Key=check_key, Body=b"")
            except ClientError as exc:
                if not self._is_access_denied(exc):
                    raise ValueError("Storage shared bucket write check failed") from exc
            else:
                await runtime_client.delete_object(Bucket=shared_bucket, Key=check_key)
                raise ValueError("Storage runtime credentials must not write to the shared bucket")

            # Reject credentials that can access another assigned application bucket.
            for listed_bucket_name in other_application_buckets:
                if listed_bucket_name in {application_bucket, shared_bucket}:
                    continue

                try:
                    await runtime_client.list_objects_v2(Bucket=listed_bucket_name, MaxKeys=1)
                except ClientError as exc:
                    if not self._is_access_denied(exc):
                        raise ValueError("Storage cross-application read check failed") from exc
                else:
                    raise ValueError("Storage runtime credentials must not read other application buckets")

                try:
                    response = await runtime_client.get_object(Bucket=listed_bucket_name, Key=check_key)
                    await self._drain_object_body(response)
                except ClientError as exc:
                    if self._is_missing_object(exc):
                        raise ValueError("Storage runtime credentials must not read other application buckets") from exc
                    if not self._is_access_denied(exc):
                        raise ValueError("Storage cross-application read check failed") from exc
                else:
                    raise ValueError("Storage runtime credentials must not read other application buckets")

                try:
                    await runtime_client.put_object(Bucket=listed_bucket_name, Key=check_key, Body=b"")
                except ClientError as exc:
                    if not self._is_access_denied(exc):
                        raise ValueError("Storage cross-application write check failed") from exc
                else:
                    await runtime_client.delete_object(Bucket=listed_bucket_name, Key=check_key)
                    raise ValueError("Storage runtime credentials must not write other application buckets")

        return credentials

    async def bucket(self, bucket_name: str) -> str:
        """Create one assigned bucket and return its name."""

        async with self._client() as client:
            # S3-compatible services disagree on repeated creates, so verify access when a bucket exists.
            try:
                await client.create_bucket(Bucket=bucket_name)
            except ClientError as exc:
                if self._error_code(exc) not in self._BUCKET_EXISTS_CODES:
                    raise

                await client.head_bucket(Bucket=bucket_name)

        return bucket_name

    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None

from __future__ import annotations

import asyncio
import boto3
import contextlib
import secrets
from .base import (Storage, StorageBucketUsage, StorageObjectData,
                   StorageRuntimeCredentials)
from typing import TYPE_CHECKING
from datetime import datetime
from botocore.exceptions import ClientError
from src.utils.namespace import s3name

if TYPE_CHECKING:
    from mypy_boto3_s3.type_defs import ObjectIdentifierTypeDef


class S3(Storage):
    """S3-compatible storage adapter."""

    _ACCESS_DENIED_CODES = {"403", "AccessDenied", "AllAccessDisabled"}

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
        self._client = self._client_for_credentials(access_key_id, secret_access_key)

    def _client_for_credentials(self, access_key_id: str, secret_access_key: str):
        """Create an S3 client for one credential pair."""

        return boto3.client(
            "s3",
            use_ssl=self._protocol == "https",
            endpoint_url=self._endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )


    def _is_access_denied(self, exc: ClientError) -> bool:
        """Return whether an S3 client error represents denied access."""

        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        return error_code in self._ACCESS_DENIED_CODES

    def list(self) -> list[str]:
        """List storage buckets."""
        response = self._client.list_buckets()
        return [name for bucket in response.get("Buckets", []) if (name := bucket.get("Name")) is not None]


    def _create_bucket(self, bucket_name: str) -> None:
        """Create a bucket and tolerate existing accessible buckets."""

        # S3-compatible services disagree on repeated creates, so verify access when a bucket exists.
        try:
            self._client.create_bucket(Bucket=bucket_name)
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if error_code not in {"BucketAlreadyExists", "BucketAlreadyOwnedByYou"}:
                raise

            self._client.head_bucket(Bucket=bucket_name)


    def _delete_bucket(self, bucket_name: str) -> None:
        """Delete all objects in a bucket, then delete the bucket itself."""

        try:
            self._client.head_bucket(Bucket=bucket_name)
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if error_code in {"404", "NoSuchBucket", "NotFound"}:
                return
            raise

        paginator = self._client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket_name):
            objects: list[ObjectIdentifierTypeDef] = [
                {"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item
            ]
            if objects:
                self._client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})

        self._client.delete_bucket(Bucket=bucket_name)


    def _validate_application_credentials(
        self,
        organization: str,
        application: str,
        credentials: StorageRuntimeCredentials,
    ) -> None:
        """Verify runtime credentials are scoped to one app and the shared bucket."""

        application_bucket = s3name(f"{organization}-{application}")
        shared_bucket = s3name(f"{organization}-shared")
        runtime_client = self._client_for_credentials(
            credentials["access_key_id"],
            credentials["secret_access_key"],
        )
        check_key = f".longlink/access-check-{secrets.token_urlsafe(8)}"

        # Prove the runtime can read and write its own application bucket.
        application_check_created = False
        try:
            runtime_client.put_object(Bucket=application_bucket, Key=check_key, Body=b"")
            application_check_created = True
            runtime_client.get_object(Bucket=application_bucket, Key=check_key)
            runtime_client.delete_object(Bucket=application_bucket, Key=check_key)
            application_check_created = False
        except ClientError as exc:
            if application_check_created:
                with contextlib.suppress(ClientError):
                    runtime_client.delete_object(Bucket=application_bucket, Key=check_key)

            raise ValueError("Storage runtime credentials need read/write access to the application bucket") from exc

        # Prove the runtime can read shared organization storage but cannot write it.
        try:
            runtime_client.list_objects_v2(Bucket=shared_bucket, MaxKeys=1)
        except ClientError as exc:
            raise ValueError("Storage runtime credentials need read access to the shared bucket") from exc

        try:
            runtime_client.put_object(Bucket=shared_bucket, Key=check_key, Body=b"")
        except ClientError as exc:
            if self._is_access_denied(exc):
                pass
            else:
                raise ValueError("Storage shared bucket write check failed") from exc
        else:
            runtime_client.delete_object(Bucket=shared_bucket, Key=check_key)
            raise ValueError("Storage runtime credentials must not write to the shared bucket")

        # Reject credentials that can access another app bucket already visible in this organization.
        bucket_prefix = f"longlink-{organization}-"
        for bucket_name in self.list():
            if bucket_name in {application_bucket, shared_bucket} or not bucket_name.startswith(bucket_prefix):
                continue

            try:
                runtime_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
            except ClientError as exc:
                if not self._is_access_denied(exc):
                    raise ValueError("Storage cross-application read check failed") from exc
            else:
                raise ValueError("Storage runtime credentials must not read other application buckets")

            try:
                runtime_client.put_object(Bucket=bucket_name, Key=check_key, Body=b"")
            except ClientError as exc:
                if not self._is_access_denied(exc):
                    raise ValueError("Storage cross-application write check failed") from exc
            else:
                runtime_client.delete_object(Bucket=bucket_name, Key=check_key)
                raise ValueError("Storage runtime credentials must not write other application buckets")


    async def buckets(self) -> list[str]:
        """List storage buckets."""

        return await asyncio.to_thread(self.list)


    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

        return await asyncio.to_thread(self._objects, bucket_name, limit=limit)


    async def bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate usage details for one S3 bucket."""

        return await asyncio.to_thread(self._bucket_usage, bucket_name)


    async def delete_bucket(self, bucket_name: str) -> None:
        """Delete one S3 bucket and all listed objects."""

        await asyncio.to_thread(self._delete_bucket, bucket_name)


    async def application_credentials(self, organization: str, application: str) -> StorageRuntimeCredentials:
        """Return validated runtime credentials for one application."""

        credentials: StorageRuntimeCredentials = {
            "access_key_id": self._access_key_id,
            "secret_access_key": self._secret_access_key,
        }
        await asyncio.to_thread(self._validate_application_credentials, organization, application, credentials)
        return credentials


    def _objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket through the synchronous S3 client."""

        if limit <= 0:
            return []

        objects: list[StorageObjectData] = []
        paginator = self._client.get_paginator("list_objects_v2")
        pages = paginator.paginate(
            Bucket=bucket_name,
            PaginationConfig={
                "MaxItems": limit,
                "PageSize": min(1000, limit),
            },
        )

        # Boto3 owns continuation tokens; keep only the response normalization here.
        for page in pages:
            for item in page.get("Contents", []):
                if len(objects) >= limit:
                    return objects

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


    def _bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate object count and size for one bucket."""

        object_count = 0
        space_used = 0
        paginator = self._client.get_paginator("list_objects_v2")

        # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
        for page in paginator.paginate(Bucket=bucket_name):
            for item in page.get("Contents", []):
                object_count += 1
                space_used += int(item.get("Size", 0))

        return {"object_count": object_count, "space_used": space_used}


    async def tenant(self, organization: str) -> str:
        """Return the storage tenant identifier for one organization."""

        return organization


    async def shared_bucket(self, organization: str) -> str:
        """Create the shared organization bucket and return its name."""

        bucket_name = s3name(f"{organization}-shared")
        await asyncio.to_thread(self._create_bucket, bucket_name)
        return bucket_name


    async def bucket(self, organization: str, application: str) -> str:
        """Create the application bucket and return its name."""

        bucket_name = s3name(f"{organization}-{application}")
        await asyncio.to_thread(self._create_bucket, bucket_name)
        return bucket_name


    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None

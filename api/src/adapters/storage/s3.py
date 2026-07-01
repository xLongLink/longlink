import boto3
from asyncio import to_thread
from datetime import datetime
from .base import Storage, StorageObjectData
from botocore.exceptions import ClientError
from src.utils.namespace import s3name


class S3(Storage):
    """S3-compatible storage adapter."""

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
        self._client = boto3.client(
            "s3",
            use_ssl=self._protocol == "https",
            endpoint_url=self._endpoint_url,
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
        )

    def list(self) -> list[str]:
        """List storage buckets."""
        response = self._client.list_buckets()
        return [bucket["Name"] for bucket in response.get("Buckets", [])]


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


    async def buckets(self) -> list[str]:
        """List storage buckets."""

        return await to_thread(self.list)


    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

        return await to_thread(self._objects, bucket_name, limit=limit)


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


    async def tenant(self, organization: str) -> str:
        """Return the storage tenant identifier for one organization."""

        return organization


    async def shared_bucket(self, organization: str) -> str:
        """Create the shared organization bucket and return its name."""

        bucket_name = s3name(f"{organization}-shared")
        await to_thread(self._create_bucket, bucket_name)
        return bucket_name


    async def bucket(self, organization: str, application: str) -> str:
        """Create the application bucket and return its name."""

        bucket_name = s3name(f"{organization}-{application}")
        await to_thread(self._create_bucket, bucket_name)
        return bucket_name


    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None

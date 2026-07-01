import boto3
from datetime import datetime
from .base import Storage, StorageObjectData
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


    async def buckets(self) -> list[str]:
        """List storage buckets."""

        return self.list()


    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

        objects: list[StorageObjectData] = []
        continuation_token: str | None = None

        # S3 returns at most 1000 objects per page, so continue until the limit or response end.
        while len(objects) < limit:
            request: dict[str, object] = {
                "Bucket": bucket_name,
                "MaxKeys": min(1000, limit - len(objects)),
            }
            if continuation_token is not None:
                request["ContinuationToken"] = continuation_token

            response = self._client.list_objects_v2(**request)
            for item in response.get("Contents", []):
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

            next_continuation_token = response.get("NextContinuationToken")
            continuation_token = str(next_continuation_token) if next_continuation_token is not None else None
            if not response.get("IsTruncated") or continuation_token is None:
                break

        return objects


    async def tenant(self, organization: str) -> str:
        """Return the storage tenant identifier for one organization."""

        return organization


    async def bucket(self, organization: str, application: str) -> str:
        """Create the application bucket and return its name."""

        bucket_name = s3name(f"{organization}-{application}")
        self._client.create_bucket(Bucket=bucket_name)
        return bucket_name


    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None

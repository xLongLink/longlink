from __future__ import annotations

import boto3
from .__root__ import Storage


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


    async def tenant(self, organization: str) -> str:
        """Return the storage tenant identifier for one organization."""

        return organization


    async def bucket(self, organization: str, application: str) -> str:
        """Create the application bucket and return its name."""

        bucket_name = f"{organization}-{application}"
        self._client.create_bucket(Bucket=bucket_name)
        return bucket_name


    async def remove(self, organization: str, application: str) -> None:
        """Delete the application bucket for one organization."""

        self._client.delete_bucket(Bucket=f"{organization}-{application}")


    async def delete(self, organization: str) -> None:
        """Delete every managed bucket for one organization."""

        for bucket_name in self.list():
            if bucket_name == organization or bucket_name.startswith(f"{organization}-"):
                self._client.delete_bucket(Bucket=bucket_name)

    def create(self, bucket_name: str) -> None:
        """Create one storage bucket."""
        self._client.create_bucket(Bucket=bucket_name)

    def delete_bucket(self, bucket_name: str) -> None:
        """Delete one storage bucket."""
        self._client.delete_bucket(Bucket=bucket_name)

    def usage(self) -> dict[str, int]:
        """Return the total used bytes across all buckets."""

        used_bytes = 0
        paginator = self._client.get_paginator("list_objects_v2")

        # Sum the size of every object in every bucket we manage.
        for bucket_name in self.list():
            for page in paginator.paginate(Bucket=bucket_name):
                for item in page.get("Contents", []):
                    used_bytes += item.get("Size", 0)

        return {"used_bytes": used_bytes}

    def quota(self) -> dict[str, int | None]:
        """Return the total quota for the storage backend.

        S3-compatible APIs do not expose a quota, so it is reported as
        ``None``.
        """

        return {"quota_bytes": None}

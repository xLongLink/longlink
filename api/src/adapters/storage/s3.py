from __future__ import annotations

import uuid
from contextlib import suppress

import boto3

from src.env import env

from .__root__ import Root


class Storage(Root):
    """S3-compatible storage adapter."""

    def __init__(
        self,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        """Initialize the storage adapter."""
        self._client = boto3.client(
            "s3",
            use_ssl=protocol == "https",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    def list(self) -> list[str]:
        """List storage buckets."""
        response = self._client.list_buckets()
        return [bucket["Name"] for bucket in response.get("Buckets", [])]

    def create(self, bucket_name: str) -> None:
        """Create one storage bucket."""
        self._client.create_bucket(Bucket=bucket_name)

    def delete(self, bucket_name: str) -> None:
        """Delete one storage bucket."""
        self._client.delete_bucket(Bucket=bucket_name)


root = Storage(
    protocol=env.STORAGE_PROTOCOL,
    endpoint_url=env.STORAGE_ENDPOINT_URL,
    access_key_id=env.STORAGE_ACCESS_KEY_ID,
    secret_access_key=env.STORAGE_SECRET_ACCESS_KEY,
)


def _smoke_test() -> None:
    """Exercise the storage adapter against the local object storage server."""
    adapter = Storage(
        protocol=env.STORAGE_PROTOCOL,
        endpoint_url=env.STORAGE_ENDPOINT_URL,
        access_key_id=env.STORAGE_ACCESS_KEY_ID,
        secret_access_key=env.STORAGE_SECRET_ACCESS_KEY,
    )
    bucket_name = f"ll-smoke-{uuid.uuid4().hex[:12]}"

    try:
        adapter.create(bucket_name)
        buckets = adapter.list()
        assert bucket_name in buckets, "bucket should exist after create()"

        adapter.delete(bucket_name)
        buckets = adapter.list()
        assert bucket_name not in buckets, "bucket should be removed by delete()"

        print("storage smoke test passed")
    finally:
        with suppress(Exception):
            adapter.delete(bucket_name)


if __name__ == "__main__":
    _smoke_test()

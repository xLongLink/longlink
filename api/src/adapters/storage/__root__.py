from __future__ import annotations

import boto3
from src.env import env


class Root:
    """Storage adapter root."""

    def __init__(self) -> None:
        """Initialize the storage adapter root."""
        protocol = env.STORAGE_PROTOCOL
        self._client = boto3.client(
            "s3",
            use_ssl=protocol == "https",
            endpoint_url=env.STORAGE_ENDPOINT_URL,
            aws_access_key_id=env.STORAGE_ACCESS_KEY_ID,
            aws_secret_access_key=env.STORAGE_SECRET_ACCESS_KEY,
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


root = Root()

import boto3
from typing import Protocol
from src.env import env


class S3Client(Protocol):
    """Subset of the S3 client used by this helper."""

    def create_bucket(self, *, Bucket: str) -> object:
        """Create a bucket in the storage backend."""


def create(bucket_name: str) -> None:
    """Create a bucket in the provisioned S3-compatible storage."""
    client_kwargs: dict[str, str] = {
        "endpoint_url": env.ENV_STORAGE_ENDPOINT_URL,
        "aws_access_key_id": env.ENV_STORAGE_ACCESS_KEY_ID,
        "aws_secret_access_key": env.ENV_STORAGE_SECRET_ACCESS_KEY,
    }
    if env.ENV_STORAGE_REGION_NAME:
        client_kwargs["region_name"] = env.ENV_STORAGE_REGION_NAME

    client: S3Client = boto3.client("s3", **client_kwargs)
    client.create_bucket(Bucket=bucket_name)

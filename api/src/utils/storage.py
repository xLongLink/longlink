import boto3
from src.env import env


def create(bucket_name: str) -> None:
    """Create a bucket in the provisioned S3-compatible storage."""
    client_kwargs: dict[str, str] = {
        "endpoint_url": env.STORAGE_ENDPOINT_URL,
        "aws_access_key_id": env.STORAGE_ACCESS_KEY_ID,
        "aws_secret_access_key": env.STORAGE_SECRET_ACCESS_KEY,
    }
    if env.STORAGE_REGION_NAME:
        client_kwargs["region_name"] = env.STORAGE_REGION_NAME

    client = boto3.client("s3", **client_kwargs)
    client.create_bucket(Bucket=bucket_name)

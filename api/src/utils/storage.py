import boto3
from src.env import env


def create(bucket_name: str) -> None:
    """Create a bucket in the provisioned S3-compatible storage."""
    protocol = env.STORAGE_PROTOCOL
    client_kwargs: dict[str, str | bool] = {
        "use_ssl": protocol == "https",
        "endpoint_url": env.STORAGE_ENDPOINT_URL,
        "aws_access_key_id": env.STORAGE_ACCESS_KEY_ID,
        "aws_secret_access_key": env.STORAGE_SECRET_ACCESS_KEY,
    }

    client = boto3.client("s3", **client_kwargs)
    client.create_bucket(Bucket=bucket_name)

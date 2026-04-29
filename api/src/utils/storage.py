import boto3
from src.env import env


class StorageBucketAlreadyExistsError(ValueError):
    """Raised when trying to create a bucket that already exists."""


def create(bucket_name: str) -> None:
    """Create a bucket in the provisioned S3-compatible storage."""
    client_kwargs: dict[str, str | None] = {
        "endpoint_url": env.ENV_STORAGE_ENDPOINT_URL,
        "aws_access_key_id": env.ENV_STORAGE_ACCESS_KEY_ID,
        "aws_secret_access_key": env.ENV_STORAGE_SECRET_ACCESS_KEY,
    }
    if env.ENV_STORAGE_REGION_NAME:
        client_kwargs["region_name"] = env.ENV_STORAGE_REGION_NAME

    client = boto3.client("s3", **client_kwargs)

    try:
        client.create_bucket(Bucket=bucket_name)
    except client.exceptions.BucketAlreadyExists as error:
        raise StorageBucketAlreadyExistsError(
            f"Bucket '{bucket_name}' already exists"
        ) from error
    except client.exceptions.BucketAlreadyOwnedByYou as error:
        raise StorageBucketAlreadyExistsError(
            f"Bucket '{bucket_name}' already exists"
        ) from error

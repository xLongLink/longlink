import re
import boto3
import asyncio
from src.env import env
from botocore.exceptions import ClientError

_BUCKET_NAME_PATTERN = re.compile(r'^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$')


class StoragesService:
    async def create_bucket(self, *, bucket_name: str) -> None:
        if not _BUCKET_NAME_PATTERN.fullmatch(bucket_name):
            raise ValueError('Bucket name must be 3-63 chars, lowercase, numbers or hyphens only')

        await asyncio.to_thread(self._create_bucket_sync, bucket_name)

    @staticmethod
    def _create_bucket_sync(bucket_name: str) -> None:
        client_kwargs: dict[str, str] = {
            'aws_access_key_id': env.ENV_PROVISION_STORAGE_ACCESS_KEY_ID,
            'aws_secret_access_key': env.ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY,
            'endpoint_url': env.ENV_PROVISION_STORAGE_ENDPOINT_URL,
        }
        if env.ENV_PROVISION_STORAGE_REGION_NAME:
            client_kwargs['region_name'] = env.ENV_PROVISION_STORAGE_REGION_NAME

        client = boto3.client('s3', **client_kwargs)

        try:
            client.head_bucket(Bucket=bucket_name)
            raise ValueError(f"Bucket '{bucket_name}' already exists")
        except ClientError as error:
            error_code = str(error.response.get('Error', {}).get('Code', ''))
            if error_code not in {'404', 'NoSuchBucket', 'NotFound'}:
                raise

        create_kwargs: dict[str, str | dict[str, str]] = {'Bucket': bucket_name}
        if env.ENV_PROVISION_STORAGE_REGION_NAME and env.ENV_PROVISION_STORAGE_REGION_NAME != 'us-east-1':
            create_kwargs['CreateBucketConfiguration'] = {'LocationConstraint': env.ENV_PROVISION_STORAGE_REGION_NAME}

        client.create_bucket(**create_kwargs)

import re
import boto3
import asyncio
from src.env import env
from dataclasses import dataclass
from botocore.exceptions import ClientError

_BUCKET_NAME_PATTERN = re.compile(r'^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$')


@dataclass
class StorageProvisionConfig:
    endpoint_url: str
    access_key_id: str
    secret_access_key: str
    region_name: str | None


@dataclass
class StorageUsage:
    used_bytes: int | None
    free_bytes: int | None
    bucket_count: int


class StoragesService:
    def get_config(self) -> StorageProvisionConfig:
        if not env.ENV_PROVISION_STORAGE_ENDPOINT_URL:
            raise ValueError('ENV_PROVISION_STORAGE_ENDPOINT_URL is not configured')
        if not env.ENV_PROVISION_STORAGE_ACCESS_KEY_ID:
            raise ValueError('ENV_PROVISION_STORAGE_ACCESS_KEY_ID is not configured')
        if not env.ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY:
            raise ValueError('ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY is not configured')

        return StorageProvisionConfig(
            endpoint_url=env.ENV_PROVISION_STORAGE_ENDPOINT_URL,
            access_key_id=env.ENV_PROVISION_STORAGE_ACCESS_KEY_ID,
            secret_access_key=env.ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY,
            region_name=env.ENV_PROVISION_STORAGE_REGION_NAME,
        )

    async def usage(self) -> StorageUsage:
        config = self.get_config()
        return await asyncio.to_thread(self._usage_sync, config)

    async def create_bucket(self, *, bucket_name: str) -> None:
        if not _BUCKET_NAME_PATTERN.fullmatch(bucket_name):
            raise ValueError('Bucket name must be 3-63 chars, lowercase, numbers or hyphens only')

        config = self.get_config()
        await asyncio.to_thread(self._create_bucket_sync, config, bucket_name)

    @staticmethod
    def _client_kwargs(config: StorageProvisionConfig) -> dict[str, str]:
        client_kwargs: dict[str, str] = {
            'aws_access_key_id': config.access_key_id,
            'aws_secret_access_key': config.secret_access_key,
            'endpoint_url': config.endpoint_url,
        }
        if config.region_name:
            client_kwargs['region_name'] = config.region_name
        return client_kwargs

    @staticmethod
    def _usage_sync(config: StorageProvisionConfig) -> StorageUsage:
        client = boto3.client('s3', **StoragesService._client_kwargs(config))
        buckets = client.list_buckets().get('Buckets', [])
        total_size = 0

        for bucket in buckets:
            bucket_name = str(bucket.get('Name', ''))
            continuation_token: str | None = None

            while True:
                list_kwargs: dict[str, str] = {'Bucket': bucket_name}
                if continuation_token:
                    list_kwargs['ContinuationToken'] = continuation_token

                response = client.list_objects_v2(**list_kwargs)
                for item in response.get('Contents', []):
                    total_size += int(item.get('Size', 0))

                if not response.get('IsTruncated'):
                    break

                continuation_token = response.get('NextContinuationToken')

        return StorageUsage(used_bytes=total_size, free_bytes=None, bucket_count=len(buckets))

    @staticmethod
    def _create_bucket_sync(config: StorageProvisionConfig, bucket_name: str) -> None:
        client = boto3.client('s3', **StoragesService._client_kwargs(config))

        try:
            client.head_bucket(Bucket=bucket_name)
            raise ValueError(f"Bucket '{bucket_name}' already exists")
        except ClientError as error:
            error_code = str(error.response.get('Error', {}).get('Code', ''))
            if error_code not in {'404', 'NoSuchBucket', 'NotFound'}:
                raise

        create_kwargs: dict[str, str | dict[str, str]] = {'Bucket': bucket_name}
        if config.region_name and config.region_name != 'us-east-1':
            create_kwargs['CreateBucketConfiguration'] = {'LocationConstraint': config.region_name}

        client.create_bucket(**create_kwargs)

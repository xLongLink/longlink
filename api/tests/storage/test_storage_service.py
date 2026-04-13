import time
import boto3
import pytest
from botocore.config import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from src.db.models.storages import StorageConnection
from src.db.services.storages import StoragesService

MINIO_ENDPOINT_URL = 'http://127.0.0.1:19000'
MINIO_ACCESS_KEY_ID = 'admin'
MINIO_SECRET_ACCESS_KEY = 'admin'
MINIO_REGION = 'us-east-1'


def _wait_for_minio(endpoint_url: str, access_key_id: str, secret_access_key: str, timeout_seconds: int = 30) -> None:
    client = boto3.client(
        's3',
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        endpoint_url=endpoint_url,
        region_name=MINIO_REGION,
        config=Config(signature_version='s3v4'),
    )

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            client.list_buckets()
            return
        except ClientError:
            time.sleep(1)

    raise TimeoutError('MinIO did not become ready in time.')


@pytest.mark.integration
async def test_create_bucket_with_local_minio() -> None:
    bucket_name = 'app-storage-test'

    try:
        _wait_for_minio(MINIO_ENDPOINT_URL, MINIO_ACCESS_KEY_ID, MINIO_SECRET_ACCESS_KEY)

        connection = StorageConnection(
            name='default',
            endpoint_url=MINIO_ENDPOINT_URL,
            access_key_id=MINIO_ACCESS_KEY_ID,
            secret_access_key=MINIO_SECRET_ACCESS_KEY,
            region_name=MINIO_REGION,
        )

        await StoragesService().create_bucket(
            connection=connection,
            bucket_name=bucket_name,
        )

        client = boto3.client(
            's3',
            aws_access_key_id=MINIO_ACCESS_KEY_ID,
            aws_secret_access_key=MINIO_SECRET_ACCESS_KEY,
            endpoint_url=MINIO_ENDPOINT_URL,
            region_name=MINIO_REGION,
            config=Config(signature_version='s3v4'),
        )
        response = client.head_bucket(Bucket=bucket_name)
        assert response['ResponseMetadata']['HTTPStatusCode'] == 200
    except (EndpointConnectionError, TimeoutError) as exc:  # pragma: no cover - integration env dependent
        pytest.skip(f'Local MinIO integration is unavailable: {exc}')
    finally:
        try:
            client = boto3.client(
                's3',
                aws_access_key_id=MINIO_ACCESS_KEY_ID,
                aws_secret_access_key=MINIO_SECRET_ACCESS_KEY,
                endpoint_url=MINIO_ENDPOINT_URL,
                region_name=MINIO_REGION,
                config=Config(signature_version='s3v4'),
            )
            client.delete_bucket(Bucket=bucket_name)
        except Exception:
            pass

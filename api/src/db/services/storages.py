import re
import boto3
import asyncio
from sqlalchemy import select
from src.db.models import StorageConnection
from src.db.session import get_session
from botocore.exceptions import ClientError

_BUCKET_NAME_PATTERN = re.compile(r'^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$')


class StoragesService:
    async def list(self) -> list[StorageConnection]:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageConnection))
            return list(result.scalars().all())

    async def get(self, name: str) -> StorageConnection | None:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageConnection).where(StorageConnection.name == name))
            return result.scalar_one_or_none()

    async def set(
        self,
        *,
        name: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        region_name: str | None,
    ) -> StorageConnection:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageConnection).where(StorageConnection.name == name))
            connection = result.scalar_one_or_none()

            if connection is None:
                connection = StorageConnection(
                    name=name,
                    endpoint_url=endpoint_url,
                    access_key_id=access_key_id,
                    secret_access_key=secret_access_key,
                    region_name=region_name,
                )
                session.add(connection)
            else:
                connection.endpoint_url = endpoint_url
                connection.access_key_id = access_key_id
                connection.secret_access_key = secret_access_key
                connection.region_name = region_name

            await session.commit()
            await session.refresh(connection)
            return connection

    async def delete(self, name: str) -> bool:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageConnection).where(StorageConnection.name == name))
            connection = result.scalar_one_or_none()
            if connection is None:
                return False

            await session.delete(connection)
            await session.commit()
            return True

    async def create_bucket(self, *, connection: StorageConnection, bucket_name: str) -> None:
        if not _BUCKET_NAME_PATTERN.fullmatch(bucket_name):
            raise ValueError('Bucket name must be 3-63 chars, lowercase, numbers or hyphens only')

        await asyncio.to_thread(self._create_bucket_sync, connection, bucket_name)

    @staticmethod
    def _create_bucket_sync(connection: StorageConnection, bucket_name: str) -> None:
        client_kwargs: dict[str, str] = {
            'aws_access_key_id': connection.access_key_id,
            'aws_secret_access_key': connection.secret_access_key,
            'endpoint_url': connection.endpoint_url,
        }
        if connection.region_name:
            client_kwargs['region_name'] = connection.region_name

        client = boto3.client('s3', **client_kwargs)

        try:
            client.head_bucket(Bucket=bucket_name)
            raise ValueError(f"Bucket '{bucket_name}' already exists")
        except ClientError as error:
            error_code = str(error.response.get('Error', {}).get('Code', ''))
            if error_code not in {'404', 'NoSuchBucket', 'NotFound'}:
                raise

        create_kwargs: dict[str, str | dict[str, str]] = {'Bucket': bucket_name}
        if connection.region_name and connection.region_name != 'us-east-1':
            create_kwargs['CreateBucketConfiguration'] = {'LocationConstraint': connection.region_name}

        client.create_bucket(**create_kwargs)

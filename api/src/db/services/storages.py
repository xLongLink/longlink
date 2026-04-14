import asyncio
from src.env import env
from src.utils import storage as storage_utils
from src.models.storages import StorageConnection


class StoragesService:
    async def list(self) -> list[StorageConnection]:
        return [
            StorageConnection(
                name='default',
                endpoint_url=env.ENV_PROVISION_STORAGE_ENDPOINT_URL,
                region_name=env.ENV_PROVISION_STORAGE_REGION_NAME,
            ),
        ]

    async def create_bucket(self, *, bucket_name: str) -> None:
        await asyncio.to_thread(storage_utils.create, bucket_name)

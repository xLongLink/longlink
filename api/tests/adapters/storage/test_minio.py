import pytest
import asyncio
from types import SimpleNamespace
from typing import cast
from src.utils import storage as storage_utils
from containers import DockerRuntimeContainer, require_docker_daemon
from collections.abc import AsyncIterator
from botocore.exceptions import EndpointConnectionError
from src.models.infrastructure import StorageKind
from src.adapters.storage.minio import MinIO
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_PORT = 9000


@pytest.fixture
async def minio_storage() -> AsyncIterator[tuple[MinIO, StorageRegistry]]:
    """Start a MinIO container and return its adapter plus registry details."""

    # Skip only when the Docker daemon cannot be reached.
    require_docker_daemon()
    container = DockerRuntimeContainer(
        "minio/minio:latest",
        command="server /data",
        ports=[MINIO_PORT],
        environment={
            "MINIO_ROOT_USER": MINIO_ACCESS_KEY,
            "MINIO_ROOT_PASSWORD": MINIO_SECRET_KEY,
        },
    )
    container.start()

    try:
        endpoint_url = f"http://{container.host()}:{container.port(MINIO_PORT)}"
        storage = MinIO(
            endpoint_url=endpoint_url,
            access_key_id=MINIO_ACCESS_KEY,
            secret_access_key=MINIO_SECRET_KEY,
        )
        registry = cast(
            StorageRegistry,
            SimpleNamespace(
                endpoint_url=endpoint_url,
                kind=StorageKind.minio,
                access_key_id=MINIO_ACCESS_KEY,
                secret_access_key=MINIO_SECRET_KEY,
            ),
        )

        for _ in range(60):
            try:
                await storage_utils.buckets(registry)
                break
            except EndpointConnectionError:
                await asyncio.sleep(0.5)
        else:
            pytest.fail("MinIO did not become ready before the test timeout")

        yield storage, registry
    finally:
        container.stop()


@pytest.mark.integration
async def test_minio_adapter_manages_real_bucket_usage_and_cleanup(
    minio_storage: tuple[MinIO, StorageRegistry],
) -> None:
    """Exercise MinIO lifecycle and usage reporting against real MinIO."""

    minio, registry = minio_storage

    bucket = await minio.create("acme")
    shared_prefix = "shared/"
    app_prefix = "applications/dashboard/"
    async with minio._client() as client:
        await client.put_object(Bucket=bucket, Key=f"{shared_prefix}logo.svg", Body=b"<svg />")
        await client.put_object(Bucket=bucket, Key=f"{app_prefix}reports/july.csv", Body=b"id,total\n1,42\n")
        await client.put_object(Bucket=bucket, Key=f"{app_prefix}reports/august.csv", Body=b"id,total\n2,84\n")

    buckets = await storage_utils.buckets(registry)
    usage = await storage_utils.usage(registry, bucket, app_prefix)

    await minio.delete_prefix(bucket, app_prefix)
    shared_usage = await storage_utils.usage(registry, bucket, shared_prefix)
    application_usage = await storage_utils.usage(registry, bucket, app_prefix)
    await minio.delete(bucket)
    final_buckets = await storage_utils.buckets(registry)

    assert bucket in buckets
    assert usage == {"object_count": 2, "space_used": 28}
    assert shared_usage == {"object_count": 1, "space_used": 7}
    assert application_usage == {"object_count": 0, "space_used": 0}
    assert bucket not in final_buckets

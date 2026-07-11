import pytest
import asyncio
from containers import DockerRuntimeContainer
from docker.errors import DockerException
from collections.abc import AsyncIterator
from botocore.exceptions import EndpointConnectionError
from src.adapters.storage.s3 import S3

pytestmark = pytest.mark.no_db
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_PORT = 9000


@pytest.fixture
async def minio_storage() -> AsyncIterator[S3]:
    """Start a MinIO container and return an S3 adapter connected to it."""

    container = DockerRuntimeContainer(
        "minio/minio:latest",
        command="server /data",
        ports=[MINIO_PORT],
        environment={
            "MINIO_ROOT_USER": MINIO_ACCESS_KEY,
            "MINIO_ROOT_PASSWORD": MINIO_SECRET_KEY,
        },
    )
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker is not available for S3 integration tests: {exc}")

    endpoint_url = f"http://{container.host()}:{container.port(MINIO_PORT)}"
    storage = S3(
        protocol="http",
        endpoint_url=endpoint_url,
        access_key_id=MINIO_ACCESS_KEY,
        secret_access_key=MINIO_SECRET_KEY,
    )

    try:
        for _ in range(60):
            try:
                await storage.buckets()
                break
            except EndpointConnectionError:
                await asyncio.sleep(0.5)
        else:
            pytest.fail("MinIO did not become ready before the test timeout")

        yield storage
    finally:
        container.stop()


@pytest.mark.integration
async def test_s3_adapter_manages_real_minio_buckets_objects_usage_and_cleanup(minio_storage: S3) -> None:
    """Exercise S3 bucket, object, usage, credential, and cleanup behavior against real MinIO."""

    shared_bucket = await minio_storage.bucket("longlink-acme-shared")
    repeated_shared_bucket = await minio_storage.bucket("longlink-acme-shared")
    app_bucket = await minio_storage.bucket("longlink-acme-dashboard")
    async with minio_storage._client() as client:
        await client.put_object(Bucket=app_bucket, Key="reports/july.csv", Body=b"id,total\n1,42\n")
        await client.put_object(Bucket=app_bucket, Key="reports/august.csv", Body=b"id,total\n2,84\n")

    buckets = await minio_storage.buckets()
    objects = await minio_storage.objects(app_bucket)
    limited_objects = await minio_storage.objects(app_bucket, limit=1)
    usage = await minio_storage.bucket_usage(app_bucket)

    with pytest.raises(ValueError, match="shared bucket"):
        await minio_storage.application_credentials(app_bucket, shared_bucket, [])

    await minio_storage.delete_bucket(app_bucket)
    await minio_storage.delete_bucket(shared_bucket)
    await minio_storage.delete_bucket(shared_bucket)
    final_buckets = await minio_storage.buckets()

    assert repeated_shared_bucket == shared_bucket
    assert {shared_bucket, app_bucket} <= set(buckets)
    assert {
        (item["key"], item["size"], item["etag"] is not None, item["last_modified"] is not None)
        for item in objects
    } == {
        ("reports/august.csv", 14, True, True),
        ("reports/july.csv", 14, True, True),
    }
    assert len(limited_objects) == 1
    assert limited_objects[0]["key"] in {"reports/august.csv", "reports/july.csv"}
    assert usage == {"object_count": 2, "space_used": 28}
    assert app_bucket not in final_buckets
    assert shared_bucket not in final_buckets

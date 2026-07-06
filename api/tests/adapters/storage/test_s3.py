import time
import pytest
import importlib
from collections.abc import Iterator
from tenant.storage import shared_buckets
from docker.errors import DockerException
from testcontainers.core.container import DockerContainer
from botocore.exceptions import EndpointConnectionError
from src.adapters.storage.s3 import S3

pytestmark = pytest.mark.no_db
s3_module = importlib.import_module("src.adapters.storage.s3")
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"


@pytest.fixture
def minio_storage() -> Iterator[S3]:
    """Start a MinIO container and return an S3 adapter connected to it."""

    container = (
        DockerContainer("minio/minio:latest")
        .with_env("MINIO_ROOT_USER", MINIO_ACCESS_KEY)
        .with_env("MINIO_ROOT_PASSWORD", MINIO_SECRET_KEY)
        .with_exposed_ports(9000)
        .with_command("server /data")
    )
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker is not available for S3 integration tests: {exc}")

    endpoint_url = f"http://{container.get_container_host_ip()}:{container.get_exposed_port(9000)}"
    storage = S3(
        protocol="http",
        endpoint_url=endpoint_url,
        access_key_id=MINIO_ACCESS_KEY,
        secret_access_key=MINIO_SECRET_KEY,
    )

    try:
        for _ in range(60):
            try:
                storage._client.list_buckets()
                break
            except EndpointConnectionError:
                time.sleep(0.5)
        else:
            pytest.fail("MinIO did not become ready before the test timeout")

        yield storage
    finally:
        container.stop()


@pytest.mark.integration
async def test_s3_adapter_manages_real_minio_buckets_objects_usage_and_cleanup(minio_storage: S3) -> None:
    """Exercise S3 bucket, object, usage, credential, and cleanup behavior against real MinIO."""

    storage = minio_storage

    shared_bucket = await shared_buckets.ensure(storage, "acme")
    repeated_shared_bucket = await shared_buckets.ensure(storage, "acme")
    app_bucket = await storage.bucket("acme", "dashboard")
    storage._client.put_object(Bucket=app_bucket, Key="reports/july.csv", Body=b"id,total\n1,42\n")
    storage._client.put_object(Bucket=app_bucket, Key="reports/august.csv", Body=b"id,total\n2,84\n")

    buckets = await storage.buckets()
    objects = await storage.objects(app_bucket)
    limited_objects = await storage.objects(app_bucket, limit=1)
    usage = await storage.bucket_usage(app_bucket)

    with pytest.raises(ValueError, match="shared bucket"):
        await storage.application_credentials("acme", "dashboard")

    await storage.delete_bucket(app_bucket)
    await storage.delete_bucket(shared_bucket)
    await storage.delete_bucket(shared_bucket)

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
    assert app_bucket not in await storage.buckets()
    assert shared_bucket not in await storage.buckets()

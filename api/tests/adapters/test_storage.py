import pytest
from datetime import UTC, datetime
from unittest.mock import Mock
from botocore.exceptions import ClientError
from src.adapters.storage.s3 import S3

pytestmark = pytest.mark.no_db


@pytest.fixture(autouse=True)
def run_storage_threads_inline(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run storage adapter thread offloads inline for deterministic unit tests."""

    async def inline_to_thread(function, /, *args, **kwargs):
        """Execute a normally-threaded call directly."""

        return function(*args, **kwargs)

    monkeypatch.setattr("src.adapters.storage.s3.asyncio.to_thread", inline_to_thread)


def test_storage_list_returns_bucket_names(monkeypatch) -> None:
    """List bucket names from the S3 client response."""

    client = Mock()
    client.list_buckets.return_value = {"Buckets": [{"Name": "alpha"}, {"Name": "beta"}]}

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert storage.list() == ["alpha", "beta"]
    client.list_buckets.assert_called_once_with()


async def test_storage_buckets_returns_bucket_names(monkeypatch) -> None:
    """List bucket names from the S3 client response through the async adapter API."""

    client = Mock()
    client.list_buckets.return_value = {"Buckets": [{"Name": "alpha"}, {"Name": "beta"}]}

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.buckets() == ["alpha", "beta"]
    client.list_buckets.assert_called_once_with()


async def test_storage_shared_bucket_creates_managed_bucket(monkeypatch) -> None:
    """Create a shared organization bucket with the managed naming convention."""

    client = Mock()

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.shared_bucket("acme") == "longlink-acme-shared"
    client.create_bucket.assert_called_once_with(Bucket="longlink-acme-shared")


async def test_storage_bucket_creates_managed_application_bucket(monkeypatch) -> None:
    """Create an application bucket with the managed naming convention."""

    client = Mock()

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.bucket("acme", "dashboard") == "longlink-acme-dashboard"
    client.create_bucket.assert_called_once_with(Bucket="longlink-acme-dashboard")


async def test_storage_bucket_reuses_existing_accessible_bucket(monkeypatch) -> None:
    """Reuse an existing accessible bucket when a repeated create reports a conflict."""

    client = Mock()
    client.create_bucket.side_effect = ClientError(
        {"Error": {"Code": "BucketAlreadyOwnedByYou", "Message": "Bucket already exists"}},
        "CreateBucket",
    )

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.shared_bucket("acme") == "longlink-acme-shared"
    client.create_bucket.assert_called_once_with(Bucket="longlink-acme-shared")
    client.head_bucket.assert_called_once_with(Bucket="longlink-acme-shared")


async def test_storage_objects_returns_bucket_object_metadata(monkeypatch) -> None:
    """List object metadata from the S3 client response."""

    last_modified = datetime(2026, 7, 1, tzinfo=UTC)
    paginator = Mock()
    paginator.paginate.return_value = [
        {
            "Contents": [
                {
                    "Key": "reports/july.csv",
                    "Size": 123,
                    "ETag": '"abc123"',
                    "LastModified": last_modified,
                }
            ]
        }
    ]
    client = Mock()
    client.get_paginator.return_value = paginator

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.objects("alpha") == [
        {
            "key": "reports/july.csv",
            "size": 123,
            "etag": '"abc123"',
            "last_modified": last_modified,
        }
    ]
    client.get_paginator.assert_called_once_with("list_objects_v2")
    paginator.paginate.assert_called_once_with(
        Bucket="alpha",
        PaginationConfig={
            "MaxItems": 1000,
            "PageSize": 1000,
        },
    )


async def test_storage_objects_limits_paginator_results(monkeypatch) -> None:
    """Stop returning object metadata once the requested limit is reached."""

    paginator = Mock()
    paginator.paginate.return_value = [
        {
            "Contents": [
                {"Key": "one.txt", "Size": 1},
                {"Key": "two.txt", "Size": 2},
                {"Key": "three.txt", "Size": 3},
            ]
        }
    ]
    client = Mock()
    client.get_paginator.return_value = paginator

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert await storage.objects("alpha", limit=2) == [
        {"key": "one.txt", "size": 1, "etag": None, "last_modified": None},
        {"key": "two.txt", "size": 2, "etag": None, "last_modified": None},
    ]
    paginator.paginate.assert_called_once_with(
        Bucket="alpha",
        PaginationConfig={
            "MaxItems": 2,
            "PageSize": 2,
        },
    )

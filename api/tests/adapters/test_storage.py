import pytest
from datetime import UTC, datetime
from unittest.mock import ANY, Mock
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


@pytest.fixture
def storage_client(monkeypatch: pytest.MonkeyPatch) -> Mock:
    """Patch boto3 and return the fake S3 client."""

    client = Mock()
    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))
    return client


@pytest.fixture
def storage(storage_client: Mock) -> S3:
    """Return an S3 adapter using the fake client."""

    return S3(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )


async def test_storage_buckets_returns_bucket_names(storage: S3, storage_client: Mock) -> None:
    """List bucket names from the S3 client response through the async adapter API."""

    storage_client.list_buckets.return_value = {"Buckets": [{"Name": "alpha"}, {"Name": "beta"}]}

    assert await storage.buckets() == ["alpha", "beta"]
    storage_client.list_buckets.assert_called_once_with()


@pytest.mark.parametrize(
    ("method_name", "arguments", "bucket_name"),
    [
        ("shared_bucket", ("acme",), "longlink-acme-shared"),
        ("bucket", ("acme", "dashboard"), "longlink-acme-dashboard"),
    ],
)
async def test_storage_creates_managed_buckets(
    storage: S3,
    storage_client: Mock,
    method_name: str,
    arguments: tuple[str, ...],
    bucket_name: str,
) -> None:
    """Create managed buckets with the expected naming convention."""

    method = getattr(storage, method_name)
    assert await method(*arguments) == bucket_name
    storage_client.create_bucket.assert_called_once_with(Bucket=bucket_name)


async def test_storage_bucket_reuses_existing_accessible_bucket(
    storage: S3,
    storage_client: Mock,
) -> None:
    """Reuse an existing accessible bucket when a repeated create reports a conflict."""

    storage_client.create_bucket.side_effect = ClientError(
        {"Error": {"Code": "BucketAlreadyOwnedByYou", "Message": "Bucket already exists"}},
        "CreateBucket",
    )

    assert await storage.shared_bucket("acme") == "longlink-acme-shared"
    storage_client.create_bucket.assert_called_once_with(Bucket="longlink-acme-shared")
    storage_client.head_bucket.assert_called_once_with(Bucket="longlink-acme-shared")


async def test_storage_application_credentials_validate_runtime_access(
    storage: S3,
    storage_client: Mock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Accept credentials that can write the app bucket and only read shared storage."""

    runtime_client = Mock()
    runtime_client.put_object.side_effect = [None, ClientError({"Error": {"Code": "AccessDenied"}}, "PutObject"), ClientError({"Error": {"Code": "AccessDenied"}}, "PutObject")]
    runtime_client.list_objects_v2.side_effect = [None, ClientError({"Error": {"Code": "AccessDenied"}}, "ListObjectsV2")]
    storage_client.list_buckets.return_value = {
        "Buckets": [
            {"Name": "longlink-acme-shared"},
            {"Name": "longlink-acme-dashboard"},
            {"Name": "longlink-acme-reports"},
        ]
    }
    monkeypatch.setattr(storage, "_client_for_credentials", Mock(return_value=runtime_client))

    credentials = await storage.application_credentials("acme", "dashboard")

    assert credentials == {"access_key_id": "access-key", "secret_access_key": "secret-key"}
    runtime_client.put_object.assert_any_call(Bucket="longlink-acme-dashboard", Key=ANY, Body=b"")
    runtime_client.list_objects_v2.assert_any_call(Bucket="longlink-acme-shared", MaxKeys=1)
    runtime_client.put_object.assert_any_call(Bucket="longlink-acme-shared", Key=ANY, Body=b"")
    runtime_client.list_objects_v2.assert_any_call(Bucket="longlink-acme-reports", MaxKeys=1)


async def test_storage_application_credentials_reject_shared_write_access(
    storage: S3,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject credentials that can write organization-shared storage."""

    runtime_client = Mock()
    monkeypatch.setattr(storage, "_client_for_credentials", Mock(return_value=runtime_client))

    with pytest.raises(ValueError, match="shared bucket"):
        await storage.application_credentials("acme", "dashboard")

    runtime_client.delete_object.assert_any_call(Bucket="longlink-acme-shared", Key=ANY)


async def test_storage_application_credentials_reject_other_app_bucket_access(
    storage: S3,
    storage_client: Mock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject credentials that can read another app bucket in the organization."""

    runtime_client = Mock()
    runtime_client.put_object.side_effect = [None, ClientError({"Error": {"Code": "AccessDenied"}}, "PutObject")]
    storage_client.list_buckets.return_value = {
        "Buckets": [
            {"Name": "longlink-acme-shared"},
            {"Name": "longlink-acme-dashboard"},
            {"Name": "longlink-acme-reports"},
        ]
    }
    monkeypatch.setattr(storage, "_client_for_credentials", Mock(return_value=runtime_client))

    with pytest.raises(ValueError, match="other application buckets"):
        await storage.application_credentials("acme", "dashboard")


async def test_storage_objects_returns_bucket_object_metadata(
    storage: S3,
    storage_client: Mock,
) -> None:
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
    storage_client.get_paginator.return_value = paginator

    assert await storage.objects("alpha") == [
        {
            "key": "reports/july.csv",
            "size": 123,
            "etag": '"abc123"',
            "last_modified": last_modified,
        }
    ]
    storage_client.get_paginator.assert_called_once_with("list_objects_v2")
    paginator.paginate.assert_called_once_with(
        Bucket="alpha",
        PaginationConfig={
            "MaxItems": 1000,
            "PageSize": 1000,
        },
    )


async def test_storage_objects_limits_paginator_results(
    storage: S3,
    storage_client: Mock,
) -> None:
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
    storage_client.get_paginator.return_value = paginator

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

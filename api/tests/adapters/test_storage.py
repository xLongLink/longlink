from unittest.mock import Mock, call
from datetime import UTC, datetime
from src.adapters.storage.s3 import S3


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


async def test_storage_objects_returns_bucket_object_metadata(monkeypatch) -> None:
    """List object metadata from the S3 client response."""

    last_modified = datetime(2026, 7, 1, tzinfo=UTC)
    client = Mock()
    client.list_objects_v2.return_value = {
        "Contents": [
            {
                "Key": "reports/july.csv",
                "Size": 123,
                "ETag": '"abc123"',
                "LastModified": last_modified,
            }
        ],
        "IsTruncated": False,
    }

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
    client.list_objects_v2.assert_called_once_with(Bucket="alpha", MaxKeys=1000)


async def test_storage_objects_paginates_until_limit(monkeypatch) -> None:
    """Continue listing objects until the requested limit is reached."""

    client = Mock()
    client.list_objects_v2.side_effect = [
        {
            "Contents": [{"Key": "one.txt", "Size": 1}],
            "IsTruncated": True,
            "NextContinuationToken": "next-page",
        },
        {
            "Contents": [{"Key": "two.txt", "Size": 2}],
            "IsTruncated": False,
        },
    ]

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
    assert client.list_objects_v2.call_args_list == [
        call(Bucket="alpha", MaxKeys=2),
        call(Bucket="alpha", MaxKeys=1, ContinuationToken="next-page"),
    ]

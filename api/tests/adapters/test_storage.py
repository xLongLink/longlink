from unittest.mock import Mock
from src.adapters.storage.s3 import Storage


def test_storage_usage_sums_objects_across_buckets(monkeypatch) -> None:
    """Sum all object sizes and report unknown free space."""

    client = Mock()
    client.list_buckets.return_value = {"Buckets": [{"Name": "alpha"}, {"Name": "beta"}]}
    paginator = Mock()
    paginator.paginate.side_effect = [
        [{"Contents": [{"Size": 10}, {"Size": 15}]}],
        [{"Contents": [{"Size": 7}, {"Size": 3}, {"Size": 5}]}],
    ]
    client.get_paginator.return_value = paginator

    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = Storage(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert storage.usage() == {"used_bytes": 40}
    client.get_paginator.assert_called_once_with("list_objects_v2")


def test_storage_quota_returns_unknown_quota(monkeypatch) -> None:
    """Report unknown quota for S3-compatible storage."""

    client = Mock()
    monkeypatch.setattr("src.adapters.storage.s3.boto3.client", Mock(return_value=client))

    storage = Storage(
        protocol="https",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    assert storage.quota() == {"quota_bytes": None}

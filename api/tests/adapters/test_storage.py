from unittest.mock import Mock
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

import pytest
from src.utils import storage
from unittest.mock import Mock


@pytest.mark.unit
def test_create_raises_when_bucket_exists(monkeypatch):
    """Storage helper should raise when bucket already exists in provider."""
    fake_client = Mock()
    fake_client.head_bucket.return_value = None

    def _client_stub(*args, **kwargs):
        """Return fake S3 client for storage helper call."""
        return fake_client

    monkeypatch.setattr(storage.boto3, "client", _client_stub)

    with pytest.raises(ValueError, match="already exists"):
        storage.create("existing-bucket")

    fake_client.create_bucket.assert_not_called()

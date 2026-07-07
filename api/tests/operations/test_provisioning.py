import pytest
from types import SimpleNamespace
from src.operations.provisioning import runtime_environment, runtime_storage_url

pytestmark = pytest.mark.no_db


def test_runtime_storage_url_uses_runtime_endpoint_and_escaped_credentials() -> None:
    """Build a storage URL from runtime endpoint and scoped runtime credentials."""

    registry = SimpleNamespace(
        endpoint_url="https://storage.control.longlink.internal",
        runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
    )
    credentials = {"access_key_id": "access/key", "secret_access_key": "secret@key"}

    assert runtime_storage_url(registry, credentials) == (
        "s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000"
    )


def test_runtime_environment_requires_storage_credentials() -> None:
    """Reject storage runtime env creation without scoped credentials."""

    registry = SimpleNamespace(
        endpoint_url="https://storage.control.longlink.internal",
        runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
    )

    with pytest.raises(ValueError, match="Storage runtime credentials"):
        runtime_environment("dashboard", "postgresql://fake", registry)

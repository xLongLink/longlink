import pytest
import urllib.parse
from types import SimpleNamespace
from src.operations.provisioning import (runtime_storage_url,
                                          runtime_database_url)

pytestmark = pytest.mark.no_db


def _query_dict(url: str) -> dict[str, list[str]]:
    """Build a URL query map for simple assertions."""

    return {
        key: [value]
        for key, value in urllib.parse.parse_qsl(
            urllib.parse.urlsplit(url).query,
            keep_blank_values=True,
        )
    }


def test_runtime_database_url_strips_sslmode_for_asyncpg() -> None:
    """Convert psycopg URLs to asyncpg and remove sslmode for compatibility."""

    source = "postgresql+psycopg://user:pass@postgres.local:5432/longlink?application_name=longlink&sslmode=disable"

    converted = runtime_database_url(source)

    assert converted == "postgresql+asyncpg://user:pass@postgres.local:5432/longlink?application_name=longlink"


def test_runtime_database_url_keeps_other_query_params() -> None:
    """Preserve unrelated query parameters while dropping sslmode."""

    source = "postgresql+psycopg://user:pass@postgres.local:5432/longlink?sslmode=require&search_path=%22public%22&application_name=longlink"

    converted = runtime_database_url(source)

    assert "sslmode" not in _query_dict(converted)
    assert _query_dict(converted) == {"search_path": ["\"public\""], "application_name": ["longlink"]}


def test_runtime_database_url_case_insensitive_sslmode_filter() -> None:
    """Handle uppercase SSLMODE keys as well as lowercase."""

    source = "postgresql+psycopg://user:pass@postgres.local:5432/longlink?SSLMODE=require&target_session_attrs=read-write"

    converted = runtime_database_url(source)

    assert converted.startswith("postgresql+asyncpg://")
    assert "SSLMODE" not in converted
    assert "sslmode" not in converted
    assert _query_dict(converted) == {"target_session_attrs": ["read-write"]}


def test_runtime_storage_url_uses_runtime_endpoint_and_escaped_credentials() -> None:
    """Build a storage URL from runtime endpoint and registry credentials."""

    registry = SimpleNamespace(
        endpoint_url="https://storage.control.longlink.internal",
        runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
        access_key_id="access/key",
        secret_access_key="secret@key",
    )

    assert runtime_storage_url(registry) == (
        "s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000"
    )

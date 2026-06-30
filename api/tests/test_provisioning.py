from urllib.parse import parse_qsl, urlsplit

from src.operations.provisioning import runtime_database_url


def _query_dict(url: str) -> dict[str, list[str]]:
    """Build a URL query map for simple assertions."""

    return {key: [value] for key, value in parse_qsl(urlsplit(url).query, keep_blank_values=True)}


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

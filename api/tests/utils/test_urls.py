import pytest
import urllib.parse
from src.utils import urls

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("sqlite+aiosqlite:///./dev.db", "sqlite+aiosqlite:///./dev.db"),
        (
            "postgresql://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require",
        ),
        (
            "postgres://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require",
        ),
        (
            "postgresql+psycopg://control:secret@db:5432/longlink?sslmode=require&application_name=longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?application_name=longlink&ssl=require",
        ),
    ],
)
def test_database_url_normalization(source: str, expected: str) -> None:
    """Normalize database URLs for async SQLAlchemy usage."""

    assert urls.database(source) == expected


@pytest.mark.parametrize(
    ("source", "expected_query"),
    [
        (
            "postgresql://control:secret@db:5432/longlink?sslmode=disable&search_path=%22public%22&application_name=longlink",
            [("search_path", '"public"'), ("application_name", "longlink")],
        ),
        (
            "postgresql+psycopg2://control:secret@db:5432/longlink?SSLMODE=disable&target_session_attrs=read-only",
            [("target_session_attrs", "read-only")],
        ),
    ],
)
def test_database_url_translates_sslmode_and_preserves_other_query_params(
    source: str,
    expected_query: list[tuple[str, str]],
) -> None:
    """Translate SSL mode parameters while preserving unrelated PostgreSQL query options."""

    normalized = urls.database(source)
    parsed_query = urllib.parse.parse_qsl(urllib.parse.urlsplit(normalized).query)

    assert normalized.startswith("postgresql+asyncpg://")
    assert {key.lower() for key, _value in parsed_query}.isdisjoint({"sslmode"})
    assert dict(parsed_query) == {**dict(expected_query), "ssl": "disable"}

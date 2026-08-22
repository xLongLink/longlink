import pytest
import urllib.parse
from src.utils import urls

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("sqlite+aiosqlite:///./dev.db", "sqlite+aiosqlite:///./dev.db"),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require",
        ),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require&application_name=longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?application_name=longlink&ssl=require",
        ),
    ],
)
def test_database_url_normalization(source: str, expected: str) -> None:
    """Normalize database URLs for async SQLAlchemy usage."""

    assert urls.database(source).url.render_as_string(hide_password=False) == expected


@pytest.mark.parametrize(
    ("source", "expected_query"),
    [
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=disable&search_path=%22public%22&application_name=longlink",
            [("search_path", '"public"'), ("application_name", "longlink")],
        ),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=disable&target_session_attrs=read-only",
            [("target_session_attrs", "read-only")],
        ),
    ],
)
def test_database_url_preserves_ssl_and_other_query_params(
    source: str,
    expected_query: list[tuple[str, str]],
) -> None:
    """Preserve valid SSL and unrelated PostgreSQL query options."""

    normalized = urls.database(source).url.render_as_string(hide_password=False)
    parsed_query = urllib.parse.parse_qsl(urllib.parse.urlsplit(normalized).query)

    assert normalized.startswith("postgresql+asyncpg://")
    assert dict(parsed_query) == {**dict(expected_query), "ssl": "disable"}


def test_mysql_database_url_removes_tls_query_parameters_and_preserves_options() -> None:
    """Move MySQL TLS configuration to connect arguments without losing other URL options."""

    # Normalize explicit disabled TLS while retaining an unrelated driver option.
    connection = urls.database("mysql+aiomysql://control:secret@db:3306/longlink?ssl-mode=DISABLED&charset=utf8mb4")

    # TLS values are consumed by the adapter and non-TLS query options remain in the URL.
    assert connection.url.render_as_string(hide_password=False) == "mysql+aiomysql://control:secret@db:3306/longlink?charset=utf8mb4"
    assert connection.connect_args == {"init_command": "SET time_zone = '+00:00'"}

import ssl
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
            {"search_path": '"public"', "application_name": "longlink"},
        ),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=disable&target_session_attrs=read-only",
            {"target_session_attrs": "read-only"},
        ),
    ],
)
def test_database_url_preserves_ssl_and_other_query_params(
    source: str,
    expected_query: dict[str, str],
) -> None:
    """Preserve valid SSL and unrelated PostgreSQL query options."""

    normalized = urls.database(source).url.render_as_string(hide_password=False)
    parsed_query = urllib.parse.parse_qsl(urllib.parse.urlsplit(normalized).query)

    assert dict(parsed_query) == {**expected_query, "ssl": "disable"}


def test_mysql_database_url_removes_tls_query_parameters_and_preserves_options() -> None:
    """Move MySQL TLS configuration to connect arguments without losing other URL options."""

    # Normalize explicit disabled TLS while retaining an unrelated driver option.
    connection = urls.database("mysql+aiomysql://control:secret@db:3306/longlink?ssl-mode=DISABLED&charset=utf8mb4")

    # TLS values are consumed by the adapter and non-TLS query options remain in the URL.
    assert connection.url.render_as_string(hide_password=False) == "mysql+aiomysql://control:secret@db:3306/longlink?charset=utf8mb4"


@pytest.mark.parametrize(
    ("query", "message"),
    [
        pytest.param("ssl_version=TLSv1", "unsupported TLS parameters", id="unsupported-tls-option"),
        pytest.param("ssl-mode=INVALID", "invalid ssl-mode", id="invalid-mode"),
        pytest.param("ssl_ca=first&ssl_ca=second", "one ssl_ca value", id="duplicate-ca"),
        pytest.param("ssl_key=key.pem", "requires ssl_cert", id="key-without-certificate"),
        pytest.param("ssl-mode=VERIFY_CA&ssl_check_hostname=true", "conflicts with ssl-mode", id="conflicting-hostname-policy"),
        pytest.param("ssl-mode=DISABLED&ssl_cert=cert.pem", "cannot include certificates", id="disabled-with-certificate"),
    ],
)
def test_mysql_database_url_rejects_invalid_tls_configuration(query: str, message: str) -> None:
    """Reject unsupported or contradictory MySQL TLS options."""

    # Arrange
    database_url = f"mysql+aiomysql://control:secret@db:3306/longlink?{query}"

    # Act and assert
    with pytest.raises(ValueError, match=message):
        urls.database(database_url)


def test_mysql_database_url_builds_required_tls_context() -> None:
    """Build a non-verifying SSL context for MySQL's REQUIRED mode."""

    # Arrange
    database_url = "mysql+aiomysql://control:secret@db:3306/longlink?ssl-mode=REQUIRED"

    # Act
    connection = urls.database(database_url)

    # Assert
    assert connection.url.render_as_string(hide_password=False) == "mysql+aiomysql://control:secret@db:3306/longlink"
    assert connection.connect_args["init_command"] == "SET time_zone = '+00:00'"
    assert isinstance(connection.connect_args["ssl"], ssl.SSLContext)
    assert connection.connect_args["ssl"].check_hostname is False
    assert connection.connect_args["ssl"].verify_mode == ssl.CERT_NONE

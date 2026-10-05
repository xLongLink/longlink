import ssl
import pytest
from src.utils import urls

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("source", "expected", "expected_connect_args"),
    [
        ("sqlite+aiosqlite:///./dev.db", "sqlite+aiosqlite:///./dev.db", {}),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require",
            {"server_settings": {"timezone": "UTC"}},
        ),
        (
            "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=require&application_name=longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?application_name=longlink&ssl=require",
            {"server_settings": {"timezone": "UTC"}},
        ),
    ],
)
def test_database_url_normalization(source: str, expected: str, expected_connect_args: dict[str, object]) -> None:
    """Normalize database URLs for async SQLAlchemy usage."""

    # Arrange and act
    connection = urls.database(source)

    # Assert
    assert connection.url.render_as_string(hide_password=False) == expected
    assert connection.connect_args == expected_connect_args


def test_database_url_preserves_ssl_and_other_query_params() -> None:
    """Preserve valid SSL and unrelated PostgreSQL query options."""

    # Act
    connection = urls.database(
        "postgresql+asyncpg://control:secret@db:5432/longlink?ssl=disable&search_path=%22public%22&application_name=longlink"
    )

    # Assert
    assert connection.url.query == {"search_path": '"public"', "application_name": "longlink", "ssl": "disable"}
    assert connection.connect_args == {"server_settings": {"timezone": "UTC"}}


def test_mysql_database_url_removes_tls_query_parameters_and_preserves_options() -> None:
    """Move MySQL TLS configuration to connect arguments without losing other URL options."""

    # Normalize explicit disabled TLS while retaining an unrelated driver option.
    connection = urls.database("mysql+aiomysql://control:secret@db:3306/longlink?ssl-mode=DISABLED&charset=utf8mb4")

    # TLS values are consumed by the adapter and non-TLS query options remain in the URL.
    assert connection.url.render_as_string(hide_password=False) == "mysql+aiomysql://control:secret@db:3306/longlink?charset=utf8mb4"
    assert connection.connect_args == {"init_command": "SET time_zone = '+00:00'"}


@pytest.mark.parametrize(
    ("query", "message"),
    [
        pytest.param("ssl_version=TLSv1", "unsupported TLS parameters", id="unsupported-tls-option"),
        pytest.param("ssl-mode=INVALID", "invalid ssl-mode", id="invalid-mode"),
        pytest.param("ssl_ca=first&ssl_ca=second", "one ssl_ca value", id="duplicate-ca"),
        pytest.param("ssl_key=key.pem", "requires ssl_cert", id="key-without-certificate"),
        pytest.param("ssl_check_hostname=yes", "invalid ssl_check_hostname", id="invalid-hostname-policy"),
        pytest.param("ssl-mode=VERIFY_CA&ssl_check_hostname=true", "conflicts with ssl-mode", id="conflicting-hostname-policy"),
        pytest.param("ssl-mode=DISABLED&ssl_cert=cert.pem", "cannot include certificates", id="disabled-with-certificate"),
        pytest.param("ssl_cert=first&ssl_cert=second", "one ssl_cert value", id="duplicate-certificate"),
        pytest.param("ssl_key=first&ssl_key=second&ssl_cert=certificate", "one ssl_key value", id="duplicate-key"),
        pytest.param("ssl-mode=REQUIRED&ssl_ca=ca.pem", "requires VERIFY_CA or VERIFY_IDENTITY", id="unverified-ca"),
    ],
)
def test_mysql_database_url_rejects_invalid_tls_configuration(query: str, message: str) -> None:
    """Reject unsupported or contradictory MySQL TLS options."""

    # Arrange
    database_url = f"mysql+aiomysql://control:secret@db:3306/longlink?{query}"

    # Act and assert
    with pytest.raises(ValueError, match=message):
        urls.database(database_url)


@pytest.mark.parametrize(
    ("query", "check_hostname", "verify_mode"),
    [
        pytest.param("", True, ssl.CERT_REQUIRED, id="default-identity-verification"),
        pytest.param("?ssl-mode=REQUIRED", False, ssl.CERT_NONE, id="required-tls"),
        pytest.param("?ssl-mode=VERIFY_CA", False, ssl.CERT_REQUIRED, id="verify-ca"),
    ],
)
def test_mysql_database_url_builds_tls_context_for_verification_mode(query: str, check_hostname: bool, verify_mode: ssl.VerifyMode) -> None:
    """Build the configured TLS context without passing mode options to the driver."""

    # Act
    connection = urls.database(f"mysql+aiomysql://control:secret@db:3306/longlink{query}")

    # Assert
    context = connection.connect_args["ssl"]
    assert connection.url.render_as_string(hide_password=False) == "mysql+aiomysql://control:secret@db:3306/longlink"
    assert connection.connect_args["init_command"] == "SET time_zone = '+00:00'"
    assert isinstance(context, ssl.SSLContext)
    assert context.check_hostname is check_hostname
    assert context.verify_mode == verify_mode


def test_mysql_database_url_loads_optional_client_certificate(monkeypatch: pytest.MonkeyPatch) -> None:
    """Load the configured MySQL client certificate into the TLS context."""

    # Arrange
    loaded_certificates: list[tuple[str, str | None]] = []

    def load_cert_chain(self: ssl.SSLContext, certfile: str, keyfile: str | None = None) -> None:
        """Capture the configured certificate paths without reading certificate files."""

        loaded_certificates.append((certfile, keyfile))

    monkeypatch.setattr(ssl.SSLContext, "load_cert_chain", load_cert_chain)

    # Act
    connection = urls.database("mysql+aiomysql://control:secret@db:3306/longlink?ssl-mode=VERIFY_CA&ssl_cert=cert.pem&ssl_key=key.pem")

    # Assert
    context = connection.connect_args["ssl"]
    assert isinstance(context, ssl.SSLContext)
    assert context.check_hostname is False
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert loaded_certificates == [("cert.pem", "key.pem")]


@pytest.mark.parametrize(
    ("query", "message"),
    [
        pytest.param("sslmode=require", "lowercase ssl parameter", id="libpq-sslmode"),
        pytest.param("SSL=require", "lowercase ssl parameter", id="uppercase-ssl"),
        pytest.param("ssl=invalid", "invalid SSL mode", id="invalid-mode"),
    ],
)
def test_postgresql_database_url_rejects_unsupported_ssl_options(query: str, message: str) -> None:
    """Reject PostgreSQL TLS query options outside the asyncpg boundary."""

    # Act and assert
    with pytest.raises(ValueError, match=message):
        urls.database(f"postgresql+asyncpg://control:secret@db:5432/longlink?{query}")


def test_database_url_rejects_unsupported_driver() -> None:
    """Require one Platform-supported asynchronous database driver."""

    # Act and assert
    with pytest.raises(ValueError, match=r"sqlite\+aiosqlite, mysql\+aiomysql, or postgresql\+asyncpg"):
        urls.database("postgresql://control:secret@db:5432/longlink")

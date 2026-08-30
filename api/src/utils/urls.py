import ssl
import sqlalchemy.engine
from dataclasses import dataclass
from src.models.types import DatabaseSSLMode


@dataclass(frozen=True, slots=True)
class DatabaseConnection:
    """Define one validated Platform database URL and its driver arguments."""

    url: sqlalchemy.engine.URL
    connect_args: dict[str, object]


def database(database_url: str) -> DatabaseConnection:
    """Validate and normalize the Platform database connection."""

    parsed_url = sqlalchemy.engine.make_url(database_url)

    # Local development and tests use the supported asynchronous SQLite driver unchanged.
    if parsed_url.drivername == "sqlite+aiosqlite":
        return DatabaseConnection(parsed_url, {})

    # Build aiomysql's required SSL context from canonical MySQL URL parameters.
    if parsed_url.drivername == "mysql+aiomysql":
        tls_parameters = {"ssl-mode", "ssl_ca", "ssl_cert", "ssl_key", "ssl_check_hostname"}
        unsupported = {key for key in parsed_url.query if key.lower().startswith("ssl") and key not in tls_parameters}
        if unsupported:
            raise ValueError(f"MySQL database URL has unsupported TLS parameters: {', '.join(sorted(unsupported))}")

        sslmode = parsed_url.query.get("ssl-mode", "VERIFY_IDENTITY")
        if not isinstance(sslmode, str) or sslmode not in {"DISABLED", "REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY"}:
            raise ValueError("MySQL database URL has an invalid ssl-mode")

        ssl_ca = parsed_url.query.get("ssl_ca")
        if ssl_ca is not None and not isinstance(ssl_ca, str):
            raise ValueError("MySQL database URL must define one ssl_ca value")

        ssl_cert = parsed_url.query.get("ssl_cert")
        if ssl_cert is not None and not isinstance(ssl_cert, str):
            raise ValueError("MySQL database URL must define one ssl_cert value")

        ssl_key = parsed_url.query.get("ssl_key")
        if ssl_key is not None and not isinstance(ssl_key, str):
            raise ValueError("MySQL database URL must define one ssl_key value")
        if ssl_key is not None and ssl_cert is None:
            raise ValueError("MySQL database URL requires ssl_cert with ssl_key")

        ssl_check_hostname = parsed_url.query.get("ssl_check_hostname")
        if ssl_check_hostname is not None and (not isinstance(ssl_check_hostname, str) or ssl_check_hostname not in {"true", "false"}):
            raise ValueError("MySQL database URL has an invalid ssl_check_hostname")
        if ssl_check_hostname is not None:
            if (ssl_check_hostname == "true") != (sslmode == "VERIFY_IDENTITY"):
                raise ValueError("MySQL ssl_check_hostname conflicts with ssl-mode")

        normalized_url = parsed_url.difference_update_query(tls_parameters)

        # Keep MySQL temporal functions and TIMESTAMP conversions in UTC for every connection.
        connect_args: dict[str, object] = {"init_command": "SET time_zone = '+00:00'"}
        if sslmode == "DISABLED":
            if ssl_ca is not None or ssl_cert is not None or ssl_key is not None:
                raise ValueError("Disabled MySQL TLS cannot include certificates")
            return DatabaseConnection(normalized_url, connect_args)

        # REQUIRED encrypts transport without authenticating the server.
        if sslmode == "REQUIRED":
            if ssl_ca is not None:
                raise ValueError("MySQL ssl_ca requires VERIFY_CA or VERIFY_IDENTITY")
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        else:
            context = ssl.create_default_context(cafile=ssl_ca)
            context.check_hostname = sslmode == "VERIFY_IDENTITY"

        # Load an optional provider-issued client identity.
        if ssl_cert is not None:
            context.load_cert_chain(ssl_cert, keyfile=ssl_key)

        connect_args["ssl"] = context
        return DatabaseConnection(normalized_url, connect_args)

    # PostgreSQL Platform access requires the supported asynchronous driver.
    if parsed_url.drivername != "postgresql+asyncpg":
        raise ValueError("Database URL must use sqlite+aiosqlite, mysql+aiomysql, or postgresql+asyncpg")

    # Reject libpq and case variants instead of silently normalizing unsupported options.
    if any(key.lower() in {"ssl", "sslmode"} and key != "ssl" for key in parsed_url.query):
        raise ValueError("PostgreSQL database URL must use the lowercase ssl parameter")

    # Validate an explicit SSL mode or apply the secure deployment default.
    sslmode = parsed_url.query.get("ssl", DatabaseSSLMode.require.value)
    if not isinstance(sslmode, str) or sslmode not in DatabaseSSLMode:
        raise ValueError("PostgreSQL database URL has an invalid SSL mode")

    return DatabaseConnection(parsed_url.update_query_dict({"ssl": sslmode}), {"server_settings": {"timezone": "UTC"}})

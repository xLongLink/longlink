import urllib.parse
import sqlalchemy.engine
from src.models.types import DATABASE_SSL_MODES, DatabaseSSLMode

POSTGRESQL_DRIVER_NAMES = {
    "postgres",
    "postgresql",
    "postgresql+psycopg",
    "postgresql+psycopg2",
    "postgresql+asyncpg",
}


def database(database_url: str, default_sslmode: DatabaseSSLMode = DatabaseSSLMode.require) -> str:
    """Normalize the control database URL and translate PostgreSQL SSL mode for asyncpg."""

    parsed_url = sqlalchemy.engine.make_url(database_url)

    # Control-plane database access is async, so PostgreSQL connections use asyncpg.
    if parsed_url.drivername in POSTGRESQL_DRIVER_NAMES:
        # Normalize PostgreSQL aliases to the async driver.
        if parsed_url.drivername != "postgresql+asyncpg":
            parsed_url = parsed_url.set(drivername="postgresql+asyncpg")

        # asyncpg accepts libpq modes through its ssl argument rather than sslmode.
        sslmode_query_keys = [key for key in parsed_url.query if key.lower() == "sslmode"]
        ssl_query_keys = [key for key in parsed_url.query if key.lower() == "ssl"]

        # Reject ambiguous or repeated SSL settings before opening a connection.
        if len(sslmode_query_keys) > 1 or len(ssl_query_keys) > 1 or (sslmode_query_keys and ssl_query_keys):
            raise ValueError("PostgreSQL database URL has conflicting SSL modes")

        # Translate the libpq spelling to asyncpg's query argument.
        if sslmode_query_keys:
            sslmode = parsed_url.query[sslmode_query_keys[0]]
            if not isinstance(sslmode, str) or sslmode not in DATABASE_SSL_MODES:
                raise ValueError("PostgreSQL database URL has an invalid SSL mode")
            parsed_url = parsed_url.difference_update_query(sslmode_query_keys)
            parsed_url = parsed_url.update_query_dict({"ssl": sslmode})

        # Validate callers that already use the asyncpg spelling.
        elif ssl_query_keys:
            sslmode = parsed_url.query[ssl_query_keys[0]]
            if not isinstance(sslmode, str) or sslmode not in DATABASE_SSL_MODES:
                raise ValueError("PostgreSQL database URL has an invalid SSL mode")
            if ssl_query_keys[0] != "ssl":
                parsed_url = parsed_url.difference_update_query(ssl_query_keys)
                parsed_url = parsed_url.update_query_dict({"ssl": sslmode})

        # Apply the deployment default when the URL does not select a mode explicitly.
        else:
            parsed_url = parsed_url.update_query_dict({"ssl": default_sslmode.value})

        return parsed_url.render_as_string(hide_password=False)

    # MySQL needs an async DBAPI for SQLAlchemy's async engine.
    if parsed_url.drivername == "mysql" or parsed_url.drivername.startswith("mysql+") and not parsed_url.drivername.endswith("aiomysql"):
        return parsed_url.set(drivername="mysql+aiomysql").render_as_string(hide_password=False)

    return database_url


def safe_local_path(value: object, fallback: str) -> str:
    """Return a same-origin local path or the fallback path."""

    # Only string values can be safe redirect paths.
    if not isinstance(value, str):
        return fallback

    # Local paths must be rooted and not protocol-relative.
    if not value.startswith("/") or value.startswith("//") or "\\" in value:
        return fallback

    # Control characters are never valid path content.
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        return fallback

    # Use URL parsing so protocol-relative paths cannot be confused with local paths.
    parsed_path = urllib.parse.urlsplit(value)

    # Reject parsed absolute URLs after normalization.
    if parsed_path.scheme or parsed_path.netloc:
        return fallback

    return value

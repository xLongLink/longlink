import sqlalchemy.engine
from src.models.types import DATABASE_SSL_MODES, DatabaseSSLMode


def database(database_url: str, default_sslmode: DatabaseSSLMode = DatabaseSSLMode.require) -> str:
    """Validate and normalize the Platform database URL."""

    parsed_url = sqlalchemy.engine.make_url(database_url)

    # Local development and tests use the supported asynchronous SQLite driver unchanged.
    if parsed_url.drivername == "sqlite+aiosqlite":
        return database_url

    # Production Platform access requires the supported asynchronous PostgreSQL driver.
    if parsed_url.drivername != "postgresql+asyncpg":
        raise ValueError("Database URL must use sqlite+aiosqlite or postgresql+asyncpg")

    # Reject libpq and case variants instead of silently normalizing unsupported options.
    if any(key.lower() in {"ssl", "sslmode"} and key != "ssl" for key in parsed_url.query):
        raise ValueError("PostgreSQL database URL must use the lowercase ssl parameter")

    # Validate an explicit SSL mode or apply the secure deployment default.
    sslmode = parsed_url.query.get("ssl", default_sslmode.value)
    if not isinstance(sslmode, str) or sslmode not in DATABASE_SSL_MODES:
        raise ValueError("PostgreSQL database URL has an invalid SSL mode")

    return parsed_url.update_query_dict({"ssl": sslmode}).render_as_string(hide_password=False)


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

    return value

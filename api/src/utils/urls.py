import urllib.parse
import sqlalchemy.engine
from starlette.datastructures import URL

POSTGRESQL_DRIVER_NAMES = {
    "postgres",
    "postgresql",
    "postgresql+psycopg",
    "postgresql+psycopg2",
    "postgresql+asyncpg",
}


def database(database_url: str) -> str:
    """Normalize the control database URL for SQLAlchemy async engines."""

    parsed_url = sqlalchemy.engine.make_url(database_url)

    # Control-plane database access is async, so PostgreSQL connections use asyncpg.
    if parsed_url.drivername in POSTGRESQL_DRIVER_NAMES:

        # Normalize PostgreSQL aliases to the async driver.
        if parsed_url.drivername != "postgresql+asyncpg":
            parsed_url = parsed_url.set(drivername="postgresql+asyncpg")

        # sslmode is a libpq/psycopg option; asyncpg receives it as an invalid kwarg.
        sslmode_query_keys = [key for key in parsed_url.query if key.lower() == "sslmode"]

        # Remove unsupported sslmode query parameters.
        if sslmode_query_keys:
            parsed_url = parsed_url.difference_update_query(sslmode_query_keys)

        return parsed_url.render_as_string(hide_password=False)

    # MySQL needs an async DBAPI for SQLAlchemy's async engine.
    if (
        parsed_url.drivername == "mysql"
        or parsed_url.drivername.startswith("mysql+")
        and not parsed_url.drivername.endswith("aiomysql")
    ):
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


def is_https_url(value: str) -> bool:
    """Return whether a value is an absolute HTTPS URL."""

    url = URL(value.strip())
    return url.scheme == "https" and bool(url.netloc)

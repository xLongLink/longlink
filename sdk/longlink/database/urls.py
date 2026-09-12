import ssl
from sqlalchemy.engine import URL, make_url


def connect_args(
    database_url: str | URL, schema: str | None = None, sslmode: str | None = None, certificate: str | None = None
) -> dict[str, object]:
    """Return LongLink database driver connection arguments for one database URL."""

    # Other drivers require no LongLink-specific arguments.
    if make_url(database_url).drivername != "postgresql+asyncpg":
        return {}

    # Configure UTC and the Solution schema for PostgreSQL connections.
    server_settings = {"timezone": "UTC"}
    if schema is not None:
        server_settings["search_path"] = f'"{schema}", shared'

    connect_args: dict[str, object] = {"server_settings": server_settings}

    # A supplied CA always requires certificate and hostname verification, irrespective of the selected mode.
    if certificate is not None:
        connect_args["ssl"] = ssl.create_default_context(cadata=certificate)
    elif sslmode is not None:
        connect_args["ssl"] = sslmode

    return connect_args

from sqlalchemy.engine import URL, make_url


def connect_args(database_url: str | URL, schema: str | None = None, ssl: str | None = None) -> dict[str, object]:
    """Return LongLink database driver connection arguments for one database URL."""

    # Other drivers require no LongLink-specific arguments.
    if make_url(database_url).drivername != "postgresql+asyncpg":
        return {}

    # Configure UTC and the Solution schema for PostgreSQL connections.
    server_settings = {"timezone": "UTC"}
    if schema is not None:
        server_settings["search_path"] = f'"{schema}", shared'

    connect_args: dict[str, object] = {"server_settings": server_settings}
    if ssl is not None:
        connect_args["ssl"] = ssl

    return connect_args

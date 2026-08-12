from sqlalchemy.engine import URL, make_url


def connect_args(database_url: str | URL, schema: str | None = None, **additional_args: object) -> dict[str, object]:
    """Return LongLink database driver connection arguments for one database URL."""

    # Configure UTC and the Application schema at startup while passing future driver options through unchanged.
    if make_url(database_url).drivername == "postgresql+asyncpg":
        server_settings = {"timezone": "UTC"}
        if schema is not None:
            server_settings["search_path"] = f'"{schema}", shared'
        return {"server_settings": server_settings, **additional_args}

    return additional_args

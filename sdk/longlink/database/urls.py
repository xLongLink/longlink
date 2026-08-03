from sqlalchemy.engine import URL, make_url


def connect_args(database_url: str | URL, **additional_args: object) -> dict[str, object]:
    """Return LongLink database driver connection arguments for one database URL."""

    # Configure UTC at startup for asyncpg while passing future driver options through unchanged.
    if make_url(database_url).drivername == "postgresql+asyncpg":
        return {"server_settings": {"timezone": "UTC"}, **additional_args}

    return additional_args

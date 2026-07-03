import sqlalchemy.engine

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
        if parsed_url.drivername != "postgresql+asyncpg":
            parsed_url = parsed_url.set(drivername="postgresql+asyncpg")

        # sslmode is a libpq/psycopg option; asyncpg receives it as an invalid kwarg.
        sslmode_query_keys = [key for key in parsed_url.query if key.lower() == "sslmode"]
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

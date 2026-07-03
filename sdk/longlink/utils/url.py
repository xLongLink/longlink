import sqlalchemy.engine

POSTGRESQL_DRIVER_NAMES = {
    "postgres",
    "postgresql",
    "postgresql+psycopg",
    "postgresql+psycopg2",
    "postgresql+asyncpg",
}


def database(database_url: str) -> str:
    """Normalize DATABASE_URL to a URL that SQLAlchemy can use in async mode."""

    parsed_url = sqlalchemy.engine.make_url(database_url)

    # Keep local SQLite and any future non-PostgreSQL URLs untouched.
    if parsed_url.drivername not in POSTGRESQL_DRIVER_NAMES:
        return database_url

    # SDK database access is async, so PostgreSQL connections use the asyncpg dialect.
    if parsed_url.drivername != "postgresql+asyncpg":
        parsed_url = parsed_url.set(drivername="postgresql+asyncpg")

    # sslmode is a libpq/psycopg option; asyncpg receives it as an invalid kwarg through SQLAlchemy.
    sslmode_query_keys = [key for key in parsed_url.query if key.lower() == "sslmode"]
    if sslmode_query_keys:
        parsed_url = parsed_url.difference_update_query(sslmode_query_keys)

    return parsed_url.render_as_string(hide_password=False)

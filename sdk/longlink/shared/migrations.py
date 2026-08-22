import asyncio
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import URL, make_url
from importlib.resources import files


def migration_config(database_url: str | URL) -> Config:
    """Build an Alembic config for one organization database."""

    # Normalize structured and string URLs before validating the database driver.
    url = make_url(database_url)
    if url.drivername != "postgresql+asyncpg":
        raise ValueError("Shared migrations require a postgresql+asyncpg database URL")

    # Shared migrations ship with the SDK package that defines the shared contract.
    packaged_location = files("longlink.shared").joinpath("alembic")
    if not packaged_location.joinpath("env.py").is_file() or not packaged_location.joinpath("versions").is_dir():
        raise RuntimeError("LongLink shared-schema Alembic migrations could not be located")

    config = Config()
    config.set_main_option("script_location", str(packaged_location))

    # Alembic uses ConfigParser, where percent-encoded URL characters must be escaped.
    config.set_main_option("sqlalchemy.url", url.render_as_string(hide_password=False).replace("%", "%%"))
    return config


async def migrate_database(database_url: str | URL) -> None:
    """Apply shared-schema migrations without blocking the control-plane event loop."""

    await asyncio.to_thread(command.upgrade, migration_config(database_url), "head")

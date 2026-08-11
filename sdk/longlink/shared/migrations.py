import asyncio
from alembic import command
from pathlib import Path
from alembic.config import Config
from sqlalchemy.engine import URL, make_url
from importlib.resources import files


def alembic_script_location(script_location: Path | None = None) -> Path:
    """Return the SDK-owned shared-schema Alembic directory."""

    # Keep an explicit location available for migration tests and control-plane callers.
    if script_location is not None:
        return script_location

    # Shared migrations ship with the SDK package that defines the shared contract.
    packaged_location = Path(str(files("longlink.shared").joinpath("alembic")))
    if (packaged_location / "env.py").exists() and (packaged_location / "versions").is_dir():
        return packaged_location

    raise RuntimeError("LongLink shared-schema Alembic migrations could not be located")


def migration_config(database_url: str | URL, script_location: Path | None = None) -> Config:
    """Build an Alembic config for one organization database."""

    # Preserve structured credentials when callers provide a SQLAlchemy URL.
    url_value = database_url.render_as_string(hide_password=False) if isinstance(database_url, URL) else database_url
    if make_url(url_value).drivername != "postgresql+asyncpg":
        raise ValueError("Shared migrations require a postgresql+asyncpg database URL")
    config = Config()
    config.set_main_option("script_location", str(alembic_script_location(script_location)))

    # Alembic uses ConfigParser, where percent-encoded URL characters must be escaped.
    config.set_main_option("sqlalchemy.url", url_value.replace("%", "%%"))
    return config


async def migrate_database(database_url: str | URL, script_location: Path | None = None) -> None:
    """Apply shared-schema migrations without blocking the control-plane event loop."""

    await asyncio.to_thread(command.upgrade, migration_config(database_url, script_location), "head")

import asyncio
import sysconfig
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import URL

ALEMBIC_DIRECTORY = "alembic"
CURRENT_FILE = Path(__file__).resolve()


def alembic_script_location(script_location: Path | None = None) -> Path:
    """Return the Alembic script directory for tenant database migrations."""

    if script_location is not None:
        return script_location

    source_tree_location = CURRENT_FILE.parents[2] / ALEMBIC_DIRECTORY
    installed_locations = []
    for scheme in ("data", "purelib"):
        configured_path = sysconfig.get_path(scheme)
        if configured_path is not None:
            installed_locations.append(Path(configured_path) / "tenant" / ALEMBIC_DIRECTORY)

    for candidate in (source_tree_location, *installed_locations):
        if (candidate / "env.py").exists() and (candidate / "versions").is_dir():
            return candidate

    raise RuntimeError("LongLink tenant Alembic migrations could not be located")


def migration_config(database_url: str | URL, script_location: Path | None = None) -> Config:
    """Build an Alembic config for one live tenant database."""

    url_value = database_url.render_as_string(hide_password=False) if isinstance(database_url, URL) else database_url
    config = Config()
    config.set_main_option("script_location", str(alembic_script_location(script_location)))
    config.set_main_option("sqlalchemy.url", url_value)
    return config


def migrate_database_sync(database_url: str | URL, script_location: Path | None = None) -> None:
    """Apply tenant database migrations using a synchronous Alembic runner."""

    command.upgrade(migration_config(database_url, script_location), "head")


async def migrate_database(database_url: str | URL, script_location: Path | None = None) -> None:
    """Apply tenant database migrations without blocking the running event loop."""

    await asyncio.to_thread(migrate_database_sync, database_url, script_location)

import pytest
from alembic import command
from pathlib import Path
from containers import mysql_container, postgres_container
from contextlib import ExitStack
from alembic.config import Config
from alembic.script import ScriptDirectory
from collections.abc import Iterator
from src.environments import env
from sqlalchemy.engine import make_url

pytestmark = pytest.mark.no_db


def test_alembic_migrations_have_single_linear_head() -> None:
    """Keep the platform migration graph linear and predictable."""

    # Load the migration graph without opening a database connection.
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert len(script.get_bases()) == 1
    assert len(script.get_heads()) == 1


@pytest.fixture(
    params=[pytest.param("postgresql", marks=pytest.mark.integration), pytest.param("mysql", marks=pytest.mark.integration), "sqlite"]
)
def migration_urls(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[str]:
    """Provide a migration URL for each supported production database."""

    # Keep container lifetimes outside migration execution and engine disposal.
    with ExitStack() as stack:
        if request.param == "postgresql":
            container = stack.enter_context(postgres_container("longlink", "sec@ret", "longlink"))
            yield f"{container.get_connection_url(driver='asyncpg')}?ssl=disable"
        elif request.param == "mysql":
            mysql = stack.enter_context(mysql_container("longlink", "sec@ret", "longlink"))
            url = make_url(mysql.get_connection_url())
            yield url.set(drivername="mysql+aiomysql", query={"ssl-mode": "DISABLED"}).render_as_string(hide_password=False)
        else:
            path = tmp_path / "migration.db"
            yield f"sqlite+aiosqlite:///{path}"


def test_migrations_execute_and_match_current_metadata(monkeypatch: pytest.MonkeyPatch, migration_urls: str) -> None:
    """Upgrade each production backend and check model parity."""

    # Apply the real migration graph without precreating tables from model metadata.
    monkeypatch.setattr(env, "DATABASE_URL", migration_urls)
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)

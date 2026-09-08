import pytest
from alembic import command
from pathlib import Path
from containers import postgres_container, require_docker_daemon
from contextlib import ExitStack
from sqlalchemy import inspect, create_engine
from alembic.config import Config
from alembic.script import ScriptDirectory
from collections.abc import Iterator
from src.environments import env
from sqlalchemy.engine import make_url
from src.database.models import registry
from testcontainers.community.mysql import MySqlContainer

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
def migration_urls(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[tuple[str, str]]:
    """Provide migration and inspection URLs for each supported production database."""

    # Keep container lifetimes outside migration execution and engine disposal.
    with ExitStack() as stack:
        if request.param == "postgresql":
            container = stack.enter_context(postgres_container("longlink", "sec@ret", "longlink"))
            yield (
                f"{container.get_connection_url(driver='asyncpg')}?ssl=disable",
                f"{container.get_connection_url(driver='psycopg')}?sslmode=disable",
            )
        elif request.param == "mysql":
            require_docker_daemon()
            mysql = MySqlContainer(
                "mysql:8.4",
                username="longlink",
                password="sec@ret",
                dbname="longlink",
                dialect="pymysql",
            )
            stack.enter_context(mysql)
            url = make_url(mysql.get_connection_url())
            yield (
                url.set(drivername="mysql+aiomysql", query={"ssl-mode": "DISABLED"}).render_as_string(hide_password=False),
                url.render_as_string(hide_password=False),
            )
        else:
            path = tmp_path / "migration.db"
            yield f"sqlite+aiosqlite:///{path}", f"sqlite:///{path}"


def test_migrations_execute_and_match_current_metadata(monkeypatch: pytest.MonkeyPatch, migration_urls: tuple[str, str]) -> None:
    """Upgrade each production backend, check model parity, and execute its downgrade."""

    # Apply the real migration graph without precreating tables from model metadata.
    database_url, inspection_url = migration_urls
    monkeypatch.setattr(env, "DATABASE_URL", database_url)
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)

    # Verify downgrade cleanup through a separate synchronous connection.
    engine = create_engine(inspection_url)
    try:
        command.downgrade(config, "base")
        with engine.connect() as connection:
            remaining_tables = set(inspect(connection).get_table_names())
        assert remaining_tables.isdisjoint(registry.metadata.tables)
    finally:
        engine.dispose()

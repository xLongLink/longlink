import pytest
from alembic import command
from pathlib import Path
from containers import postgres_container
from sqlalchemy import inspect, create_engine
from alembic.config import Config
from alembic.script import ScriptDirectory
from src.environments import env
from src.database.models import registry

pytestmark = pytest.mark.no_db


def test_alembic_migrations_have_single_linear_head() -> None:
    """Keep the platform migration graph linear and predictable."""

    # Load the migration graph without opening a database connection.
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert len(script.get_bases()) == 1
    assert len(script.get_heads()) == 1


@pytest.mark.integration
def test_migrations_execute_against_postgresql_and_match_current_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    """Execute migrations through an escaped PostgreSQL URL and compare the resulting schema."""

    # Start the supported database backend with a password that requires URL escaping.
    password = "sec@ret"
    with postgres_container("longlink", password, "longlink") as container:
        engine = None
        try:
            # Run Alembic through Testcontainers' escaped asyncpg connection URL.
            database_url = f"{container.get_connection_url(driver='asyncpg')}?ssl=disable"
            monkeypatch.setattr(env, "DATABASE_URL", database_url)
            config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
            command.upgrade(config, "head")

            # Ask Alembic to compare the upgraded schema with the complete model registry.
            command.check(config)

            # Open a synchronous connection for downgrade inspection.
            inspection_url = f"{container.get_connection_url(driver='psycopg')}?sslmode=disable"
            engine = create_engine(inspection_url)

            # Execute downgrades too and prove they remove every platform table.
            command.downgrade(config, "base")
            with engine.connect() as connection:
                remaining_tables = set(inspect(connection).get_table_names())

            assert remaining_tables.isdisjoint(registry.metadata.tables)
        finally:
            # Dispose database resources before Testcontainers removes PostgreSQL.
            if engine is not None:
                engine.dispose()

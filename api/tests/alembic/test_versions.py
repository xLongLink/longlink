import pytest
from alembic import command
from pathlib import Path
from containers import start_postgres
from sqlalchemy import inspect, create_engine
from alembic.config import Config
from alembic.script import ScriptDirectory
from src.environments import env
from src.database.models import users, computes, storages, databases, operations, association, invitations, applications, organizations
from src.database.models.base import PlatformModel

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
    encoded_password = "sec%40ret"
    container = start_postgres("longlink", password, "longlink", 5432)

    engine = None
    try:
        # Run the real Alembic environment to verify ConfigParser and SQLAlchemy preserve the encoded password.
        database_url = f"postgresql+asyncpg://longlink:{encoded_password}@{container.host()}:{container.port(5432)}/longlink?ssl=disable"
        monkeypatch.setattr(env, "DATABASE_URL", database_url)
        config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
        command.upgrade(config, "head")

        # Compare every migrated platform table and column with the current model metadata.
        inspection_url = (
            f"postgresql+psycopg://longlink:{encoded_password}@{container.host()}:{container.port(5432)}/longlink?sslmode=disable"
        )
        engine = create_engine(inspection_url)
        model_columns = {table.name: {column.name for column in table.columns} for table in PlatformModel.metadata.sorted_tables}
        with engine.connect() as connection:
            inspector = inspect(connection)
            migrated_tables = set(inspector.get_table_names())
            migrated_columns = {
                table_name: {column["name"] for column in inspector.get_columns(table_name)} for table_name in model_columns
            }

        # Require exact table and column parity rather than migration-source approximations.
        assert migrated_tables == set(model_columns) | {"alembic_version"}
        assert migrated_columns == model_columns

        # Execute downgrades too and prove they remove every platform table.
        command.downgrade(config, "base")
        with engine.connect() as connection:
            remaining_tables = set(inspect(connection).get_table_names())

        assert remaining_tables.isdisjoint(model_columns)
    finally:
        # Dispose database and container resources even when migration assertions fail.
        try:
            if engine is not None:
                engine.dispose()
        finally:
            container.stop()

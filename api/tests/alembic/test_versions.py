import pytest
from alembic import command
from pathlib import Path
from sqlmodel import SQLModel
from containers import DockerRuntimeContainer, wait_for_postgres, require_docker_daemon
from sqlalchemy import inspect, create_engine
from alembic.config import Config
from alembic.script import ScriptDirectory
from src.environments import env
from sqlalchemy.engine import Engine
from src.database.models import users, computes, storages, databases, operations, association, invitations, applications, organizations

pytestmark = pytest.mark.no_db
POSTGRES_PORT = 5432


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
    """Execute the migration history on PostgreSQL and compare its schema to SQLModel metadata."""

    # Skip only when the Docker daemon cannot be reached.
    require_docker_daemon()

    # Start the supported database backend without hiding pull or startup failures.
    container = DockerRuntimeContainer(
        "postgres:16-alpine",
        ports=[POSTGRES_PORT],
        environment={
            "POSTGRES_USER": "longlink",
            "POSTGRES_PASSWORD": "secret",
            "POSTGRES_DB": "longlink",
        },
    )
    container.start()

    engine: Engine | None = None
    try:
        # Wait for PostgreSQL connection readiness without hiding migration or schema failures.
        wait_for_postgres(container, "longlink", "secret", "longlink", POSTGRES_PORT)

        # Run the real Alembic environment against the isolated PostgreSQL database.
        database_url = f"postgresql+psycopg://longlink:secret@{container.host()}:{container.port(POSTGRES_PORT)}/longlink"
        monkeypatch.setattr(env, "DATABASE_URL", database_url)
        config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
        command.upgrade(config, "head")

        # Compare every migrated platform table and column with the current model metadata.
        engine = create_engine(database_url)
        model_columns = {table.name: {column.name for column in table.columns} for table in SQLModel.metadata.sorted_tables}
        with engine.connect() as connection:
            inspector = inspect(connection)
            migrated_tables = set(inspector.get_table_names())
            migrated_columns = {
                table_name: {column["name"] for column in inspector.get_columns(table_name)}
                for table_name in model_columns
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

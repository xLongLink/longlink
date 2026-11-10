import pytest
from io import StringIO
from alembic import command
from pathlib import Path
from longlink.database import base as database_base
from longlink.database import migrations as database_migrations
from longlink.constants import ROOT


def test_migration_environment_emits_offline_sql_without_creating_database(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Emit Solution migration SQL without opening a database connection."""

    # Arrange
    output = StringIO()
    config = database_migrations.migration_config(ROOT / ".static" / "new" / "migrations")
    config.output_buffer = output
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")

    # Act
    command.upgrade(config, "head", sql=True)

    # Assert
    sql = output.getvalue()
    assert "CREATE TABLE IF NOT EXISTS users (" in sql
    assert sql.index("CREATE TABLE IF NOT EXISTS users (") < sql.index("CREATE TABLE project (")
    assert "CREATE TABLE project (" in sql
    assert "INSERT INTO alembic_version" in sql
    assert not (tmp_path / "dev.db").exists()


@pytest.mark.usefixtures("production_environment")
def test_production_migration_environment_scopes_version_table_to_solution_schema(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Qualify production Alembic bookkeeping with the configured Solution schema."""

    # Arrange
    schema = "1234567890abcdef1234567890abcdef"
    output = StringIO()
    config = database_migrations.migration_config(ROOT / ".static" / "new" / "migrations")
    config.output_buffer = output
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_DATABASE_SCHEMA", schema)

    def unexpected_engine(_settings: object) -> None:
        """Reject database access while production migrations emit offline SQL."""

        pytest.fail("Offline migrations must not construct a database engine")

    monkeypatch.setattr(database_base, "create_engine", unexpected_engine)

    # Act
    command.upgrade(config, "head", sql=True)

    # Assert
    sql = output.getvalue()
    assert f'CREATE TABLE "{schema}".alembic_version (' in sql
    assert f'INSERT INTO "{schema}".alembic_version (version_num)' in sql
    assert "CREATE TABLE alembic_version" not in sql
    assert "INSERT INTO alembic_version" not in sql
    assert not (tmp_path / "dev.db").exists()

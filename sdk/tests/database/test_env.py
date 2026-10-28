import pytest
from io import StringIO
from alembic import command
from pathlib import Path
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

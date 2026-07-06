from pathlib import Path
from tenant.database.migrations import alembic_script_location, migration_config


def test_alembic_script_location_returns_packaged_migrations() -> None:
    """Locate the tenant Alembic script directory from the source tree."""

    # Act
    script_location = alembic_script_location()

    # Assert
    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert (script_location / "versions" / "20260706_0001_shared_users.py").exists()


def test_migration_config_uses_live_database_url_and_script_location(tmp_path: Path) -> None:
    """Build an Alembic config for a live tenant database."""

    # Arrange
    script_location = tmp_path / "alembic"
    script_location.mkdir()
    database_url = "postgresql+psycopg://user:secret@db:5432/longlink_acme"

    # Act
    config = migration_config(database_url, script_location)

    # Assert
    assert config.get_main_option("sqlalchemy.url") == database_url
    assert config.get_main_option("script_location") == str(script_location)

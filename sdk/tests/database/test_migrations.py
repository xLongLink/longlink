import pytest
from pathlib import Path
from alembic.config import Config
from longlink.database import migrations as database_migrations


@pytest.mark.usefixtures("production_environment")
def test_production_migrations_rejects_missing_revisions_before_upgrade(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail production startup without committed Solution revisions."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        database_migrations.command, "upgrade", lambda *_: pytest.fail("Alembic upgrade must not run without Solution migrations")
    )

    # Act and assert
    with pytest.raises(RuntimeError, match="require migrations"):
        database_migrations.apply_migrations()


@pytest.mark.usefixtures("production_environment")
def test_production_migrations_upgrade_head_with_committed_revision(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply committed Solution revisions in production."""

    # Arrange
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    migrations_path.joinpath("001_initial.py").write_text("", encoding="utf-8")
    captured: list[tuple[Config, str]] = []
    monkeypatch.chdir(tmp_path)

    def upgrade(config: Config, target: str) -> None:
        """Capture the Alembic configuration and revision target."""

        captured.append((config, target))

    monkeypatch.setattr(database_migrations.command, "upgrade", upgrade)

    # Act
    database_migrations.apply_migrations()

    # Assert
    [(config, target)] = captured
    assert target == "head"
    assert config.get_main_option("script_location") == str(database_migrations.CURRENT_FILE.parent)
    assert config.get_main_option("version_locations") == str(migrations_path)

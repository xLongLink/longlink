from longlink.cli import migrate
from click.testing import CliRunner


def test_migrate_command_applies_existing_migrations_when_schema_is_current(monkeypatch) -> None:
    """Apply pending migrations once when no revision is generated."""

    # Arrange
    calls: list[str] = []
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or False)

    # Act
    result = CliRunner().invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert result.output == "No migrations were created because no schema changes were detected.\n"
    assert calls == ["apply", "make"]


def test_migrate_command_applies_generated_revision(monkeypatch) -> None:
    """Apply migration changes again after Alembic generates a revision."""

    # Arrange
    calls: list[str] = []
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or True)

    # Act
    result = CliRunner().invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert result.output == "Migrations generated and applied successfully.\n"
    assert calls == ["apply", "make", "apply"]

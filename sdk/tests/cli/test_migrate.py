import pytest
from longlink.cli import migrate
from click.testing import CliRunner


@pytest.mark.parametrize(
    ("generated", "expected_output", "expected_calls"),
    [
        pytest.param(False, "No migrations were created because no schema changes were detected.\n", ["apply", "make"], id="schema-current"),
        pytest.param(True, "Migrations generated and applied successfully.\n", ["apply", "make", "apply"], id="revision-generated"),
    ],
)
def test_migrate_command_applies_existing_and_generated_migrations(
    monkeypatch,
    generated: bool,
    expected_output: str,
    expected_calls: list[str],
) -> None:
    """Apply pending migrations and reapply when a revision is generated."""

    # Arrange
    calls: list[str] = []
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or generated)

    # Act
    result = CliRunner().invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert result.output == expected_output
    assert calls == expected_calls

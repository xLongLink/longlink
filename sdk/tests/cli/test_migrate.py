import pytest
from longlink.cli import migrate
from click.testing import CliRunner


@pytest.mark.parametrize(
    ("revision_created", "expected_calls", "expected_output"),
    [
        pytest.param(
            True,
            ["apply", "make", "apply"],
            "Migrations generated and applied successfully.",
            id="revision-created",
        ),
        pytest.param(False, ["apply", "make"], "No migrations were created", id="no-revision"),
    ],
)
def test_migrate_command_applies_generated_revisions(
    monkeypatch: pytest.MonkeyPatch,
    revision_created: bool,
    expected_calls: list[str],
    expected_output: str,
) -> None:
    """Reapply migrations only when autogenerate creates a revision."""

    # Arrange
    calls: list[str] = []
    runner = CliRunner()
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or revision_created)

    # Act
    result = runner.invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert calls == expected_calls
    assert expected_output in result.output

from longlink.cli import migrate
from click.testing import CliRunner


def test_migrate_command_reapplies_when_revision_is_created(monkeypatch) -> None:
    """Apply current migrations, create a revision, then apply the generated migration."""

    calls: list[str] = []
    runner = CliRunner()
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or True)

    result = runner.invoke(migrate.migrate_command)

    assert result.exit_code == 0
    assert calls == ["apply", "make", "apply"]
    assert "Migrations generated and applied successfully." in result.output


def test_migrate_command_skips_second_apply_when_no_revision_is_created(monkeypatch) -> None:
    """Avoid a redundant migration apply when autogenerate finds no schema changes."""

    calls: list[str] = []
    runner = CliRunner()
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") and False)

    result = runner.invoke(migrate.migrate_command)

    assert result.exit_code == 0
    assert calls == ["apply", "make"]
    assert "No migrations were created" in result.output

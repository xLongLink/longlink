from click.testing import CliRunner
from longlink.cli.migrate import migrate_command


def test_migrate_command_runs_generation_then_migration(monkeypatch):
    """Ensure migrate command executes make_migrations before migrate."""
    runner = CliRunner()
    call_order = []

    def fake_make_migrations():
        """Record migration-generation call in execution order."""
        call_order.append('make_migrations')

    def fake_migrate():
        """Record migrate call in execution order."""
        call_order.append('migrate')

    monkeypatch.setattr('longlink.cli.migrate.make_migrations', fake_make_migrations)
    monkeypatch.setattr('longlink.cli.migrate.migrate', fake_migrate)

    result = runner.invoke(migrate_command)

    assert result.exit_code == 0
    assert call_order == ['make_migrations', 'migrate']
    assert 'Migrations generated and applied successfully.' in result.output

import click
from longlink.database.migrations import make_migrations, apply_migrations


@click.command(name="migrate")
def migrate_command() -> None:
    """Generate and apply database migrations for the current app."""
    apply_migrations()
    migration_created = make_migrations()
    if migration_created:
        apply_migrations()
        click.echo("Migrations generated and applied successfully.")
        return

    click.echo("No migrations were created because no schema changes were detected.")

import click
from longlink.database.migrations import migrate, make_migrations


@click.command(name="migrate")
def migrate_command():
    """Generate and apply database migrations for the current app."""
    migration_created = make_migrations()
    migrate()
    if migration_created:
        click.echo("Migrations generated and applied successfully.")
        return

    click.echo("No migrations were created because no schema changes were detected.")

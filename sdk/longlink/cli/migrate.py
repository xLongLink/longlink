import click

from longlink.database.migrations import make_migrations, migrate


@click.command(name="migrate")
def migrate_command():
    """Generate and apply database migrations for the current app."""
    make_migrations()
    migrate()
    click.echo("Migrations generated and applied successfully.")

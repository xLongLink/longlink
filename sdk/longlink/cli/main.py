import typer
from functools import wraps
from collections.abc import Callable
from longlink.cli.dev import dev_command
from longlink.cli.docs import docs_command
from longlink.cli.init import init_command
from longlink.cli.build import build_command
from longlink.cli.errors import CliError
from longlink.cli.migrate import migrate_command


def handle_errors[**Parameters](command: Callable[Parameters, None]) -> Callable[Parameters, None]:
    """Render existing CLI validation errors through the Typer entrypoint."""

    @wraps(command)
    def wrapped(*args: Parameters.args, **kwargs: Parameters.kwargs) -> None:
        """Convert a domain CLI error into a clean process exit."""

        # Preserve the established error text and exit code at the CLI boundary.
        try:
            command(*args, **kwargs)
        except CliError as error:
            typer.echo(f"Error: {error}", err=True)
            raise typer.Exit(code=1) from error

    return wrapped


# Register each typed command on the public CLI application.
main = typer.Typer(help="LongLink command line interface.")
main.command(name="build")(handle_errors(build_command))
main.command(name="dev")(handle_errors(dev_command))
main.command(name="docs")(handle_errors(docs_command))
main.command(name="init")(handle_errors(init_command))
main.command(name="migrate")(handle_errors(migrate_command))

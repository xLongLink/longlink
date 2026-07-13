import click

COMMANDS = {
    "build": "longlink.cli.build:build_command",
    "dev": "longlink.cli.dev:dev_command",
    "docs": "longlink.cli.docs:docs_command",
    "init": "longlink.cli.init:init_command",
    "migrate": "longlink.cli.migrate:migrate_command",
    "test": "longlink.cli.testing:test_command",
    "translations": "longlink.cli.translations:translations_command",
}
COMMAND_HELP = {
    "build": "Build the current LongLink application image.",
    "dev": "Run the application locally with auto-reload enabled.",
    "docs": "Show bundled XML component documentation.",
    "init": "Initialize a new LongLink project.",
    "migrate": "Generate and apply application database migrations.",
    "test": "Run application tests with pytest.",
    "translations": "Manage the application's XML translation catalog.",
}


class LazyCommandGroup(click.Group):
    """Load CLI commands only when they are requested."""

    def list_commands(self, ctx: click.Context) -> list[str]:
        """Return the available command names."""

        return sorted(COMMANDS)

    def get_command(self, ctx: click.Context, cmd_name: str) -> click.Command | None:
        """Import and return a command by name on demand."""

        # Unknown command names are delegated back to Click.
        command_path = COMMANDS.get(cmd_name)
        if command_path is None:
            return None

        module_name, command_name = command_path.split(":", 1)
        module = __import__(module_name, fromlist=[command_name])
        command = getattr(module, command_name)

        # Guard the lazy registry against accidentally pointing at non-command objects.
        if not isinstance(command, click.Command):
            raise RuntimeError(f"{command_path} did not resolve to a click command")

        return command

    def format_commands(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
        """Write command help without importing optional runtime modules."""

        # Root help only needs stable command summaries; command modules load on invocation.
        rows = [(name, COMMAND_HELP.get(name, "")) for name in self.list_commands(ctx)]
        if rows:
            with formatter.section("Commands"):
                formatter.write_dl(rows)


@click.group(cls=LazyCommandGroup)
def main() -> None:
    """longlink command line interface"""

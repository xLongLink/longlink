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


@click.group(cls=LazyCommandGroup)
def main() -> None:
    """longlink command line interface"""

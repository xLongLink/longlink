import click
from longlink.cli.dev import dev_command
from longlink.cli.init import init_command
from longlink.cli.build import build_command
from longlink.cli.migrate import migrate_command


@click.group()
def main() -> None:
    """LongLink command line interface."""


for command in (build_command, dev_command, init_command, migrate_command):
    main.add_command(command)

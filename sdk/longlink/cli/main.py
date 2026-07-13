import click
from longlink.cli.dev import dev_command
from longlink.cli.docs import docs_command
from longlink.cli.init import init_command
from longlink.cli.build import build_command
from longlink.cli.migrate import migrate_command
from longlink.cli.testing import test_command
from longlink.cli.translations import translations_command


@click.group()
def main() -> None:
    """LongLink command line interface."""


main.add_command(build_command)
main.add_command(dev_command)
main.add_command(docs_command)
main.add_command(init_command)
main.add_command(migrate_command)
main.add_command(test_command)
main.add_command(translations_command)

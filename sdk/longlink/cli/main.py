import click

from longlink.cli.build import build_command
from longlink.cli.dev import dev_command
from longlink.cli.init import init_command


@click.group()
def main():
    """longlink command line interface"""


main.add_command(dev_command)
main.add_command(init_command)
main.add_command(build_command)

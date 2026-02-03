import os
import click
from pathlib import Path
from viavai.constants import PATH


def setup(folder: Path):
    """Initialize a new viavai project"""

    os.makedirs(folder, exist_ok=True)
    click.echo(f"Project initialized in {folder}")


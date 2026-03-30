import os
import shutil
from pathlib import Path

import click

from longlink.constants import PATH


def setup(folder: Path):
    """Initialize a new longlink project."""
    sample_path = PATH / "sample"
    os.makedirs(folder, exist_ok=True)
    shutil.copytree(sample_path, folder, dirs_exist_ok=True)
    click.echo(f"Project initialized in {folder}")


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
def init_command(folder: str):
    """Initialize a new longlink project."""
    folder_path = Path(folder)
    setup(folder_path)

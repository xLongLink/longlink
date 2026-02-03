import os
import shutil
import click
from pathlib import Path
from viavai.constants import PATH


def setup(folder: Path):
    """Initialize a new viavai project"""
    sample_path = PATH / "sample"
    os.makedirs(folder, exist_ok=True)
    shutil.copytree(sample_path, folder, dirs_exist_ok=True)
    click.echo(f"Project initialized in {folder}")

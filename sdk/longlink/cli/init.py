import click
from shutil import copytree
from pathlib import Path
from longlink.constants import ROOT


def setup(target: Path) -> None:
    """Create a new blank app scaffold from the bundled static template."""

    # Copy the bundled blank project scaffold into the requested target directory.
    source = ROOT / ".static" / "new"
    target.parent.mkdir(parents=True, exist_ok=True)
    copytree(source, target, dirs_exist_ok=True)


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
def init_command(folder: str):
    """Initialize a new longlink project."""

    setup(Path(folder))

import click
from shutil import copytree
from pathlib import Path


def setup(target: Path) -> None:
    """Create a new app folder by copying the bundled sample project."""

    # Use the repository sample app as the scaffold template for new projects.
    source = Path(__file__).resolve().parents[2] / "sample"
    target.mkdir(parents=True, exist_ok=True)
    copytree(source, target, dirs_exist_ok=True)


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
def init_command(folder: str):
    """Initialize a new longlink project."""
    setup(Path(folder))

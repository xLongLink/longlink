import click
from shutil import copytree, ignore_patterns
from pathlib import Path
from longlink.constants import ROOT


def setup(target: Path, ci_provider: str | None = None) -> None:
    """Create a new blank app scaffold from the bundled static template."""

    # Copy the bundled blank project scaffold into the requested target directory.
    source = ROOT / ".static" / "new"
    target.parent.mkdir(parents=True, exist_ok=True)
    copytree(
        source,
        target,
        dirs_exist_ok=True,
        ignore=ignore_patterns(".pytest_cache", "__pycache__"),
    )

    # Add provider-specific automation files only when explicitly requested.
    if ci_provider == "github":
        source = ROOT / ".static" / "ci" / "github"
        copytree(source, target, dirs_exist_ok=True)


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
@click.option(
    "--ci",
    "ci_provider",
    type=click.Choice(["github"], case_sensitive=False),
    default=None,
    help="Add CI/CD provider files. Currently supported: github.",
)
def init_command(folder: str, ci_provider: str | None) -> None:
    """Initialize a new longlink project."""

    setup(Path(folder), ci_provider=ci_provider)

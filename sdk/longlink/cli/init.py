import click
import shutil
from pathlib import Path
from longlink.constants import ROOT


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

    # Resolve the bundled scaffold and its requested target directory.
    source = ROOT / ".static" / "new"
    target = Path(folder)

    # Scaffold generation never merges into an existing target.
    if target.exists():
        raise click.ClickException(f"Target already exists: {target}")

    # Copy the bundled blank project scaffold into the requested target directory.
    shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__", ".ruff_cache"))

    # Add provider-specific automation files only when explicitly requested.
    if ci_provider == "github":
        source = ROOT / ".static" / "ci" / "github"
        shutil.copytree(source, target, dirs_exist_ok=True)

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

    source = ROOT / ".static" / "new"
    target = Path(folder)
    target.parent.mkdir(parents=True, exist_ok=True)

    # Refuse unsafe targets so scaffold generation cannot silently merge with user files.
    if target.exists():
        # Reject file targets because the scaffold must be a directory.
        if not target.is_dir():
            raise click.ClickException(f"Target already exists and is not a directory: {target}")

        # Reject non-empty directories to avoid overwriting user files.
        if any(target.iterdir()):
            raise click.ClickException(f"Target folder is not empty: {target}")

    # Copy the bundled blank project scaffold into the requested target directory.
    shutil.copytree(
        source,
        target,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(".pytest_cache", ".venv", "__pycache__"),
    )

    # Add provider-specific automation files only when explicitly requested.
    if ci_provider == "github":
        source = ROOT / ".static" / "ci" / "github"
        shutil.copytree(source, target, dirs_exist_ok=True)

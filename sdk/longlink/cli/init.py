import re
import click
import shutil
from pathlib import Path
from longlink.constants import ROOT


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
@click.option("--name", "project_name", default=None, help="Project name. Defaults to the folder name")
@click.option(
    "--ci",
    "ci_provider",
    type=click.Choice(["github"], case_sensitive=False),
    default=None,
    help="Add CI/CD provider files. Currently supported: github.",
)
def init_command(folder: str, project_name: str | None, ci_provider: str | None) -> None:
    """Initialize a new longlink project."""

    # Resolve the requested target directory.
    target = Path(folder)
    project_name = project_name or target.name

    # Keep generated package metadata compatible with Python package conventions.
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", project_name):
        raise click.ClickException(f"Invalid project name: {project_name}")

    # Scaffold generation never merges into an existing target.
    if target.exists():
        raise click.ClickException(f"Target already exists: {target}")

    # Copy the bundled blank project scaffold into the requested target directory.
    shutil.copytree(
        ROOT / ".static" / "new",
        target,
        ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache", ".ruff_cache", ".venv"),
    )

    # Set the generated project metadata before resolving its dependencies.
    pyproject = target / "pyproject.toml"
    pyproject.write_text(pyproject.read_text(encoding="utf-8").replace("__PROJECT_NAME__", project_name), encoding="utf-8")

    # Add provider-specific automation files only when explicitly requested.
    if ci_provider == "github":
        shutil.copytree(ROOT / ".static" / "ci" / "github", target, dirs_exist_ok=True)

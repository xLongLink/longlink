import re
import typer
import shutil
from typing import Literal, Annotated
from pathlib import Path
from longlink.constants import ROOT
from longlink.cli.errors import CliError


def init_command(
    folder: Annotated[
        str, typer.Option(prompt="Enter folder name", help="Folder to initialize. Press Enter for the current directory")
    ] = ".",
    project_name: Annotated[str | None, typer.Option("--name", help="Project name. Defaults to the folder name")] = None,
    ci_provider: Annotated[
        Literal["github"] | None,
        typer.Option("--ci", case_sensitive=False, help="Add CI/CD provider files. Currently supported: github."),
    ] = None,
) -> None:
    """Initialize a new longlink project."""

    # Resolve the requested target directory.
    target = Path(folder)
    project_name = project_name or target.resolve().name

    # Keep generated package metadata compatible with Python package conventions.
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", project_name):
        raise CliError(f"Invalid project name: {project_name}")

    # Reject conflicting scaffold paths before copying into an existing directory.
    if target.is_symlink() or (target.exists() and not target.is_dir()):
        raise CliError(f"Target is not a directory: {target}")
    if target.exists():
        scaffold = ROOT / ".static" / "new"
        for source in scaffold.rglob("*"):
            destination = target / source.relative_to(scaffold)
            if destination.is_symlink() or (destination.exists() and (source.is_file() or not destination.is_dir())):
                raise CliError(f"Target already exists: {destination}")

    # Copy the bundled blank project scaffold into the requested target directory.
    shutil.copytree(
        ROOT / ".static" / "new",
        target,
        ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache", ".ruff_cache", ".venv"),
        dirs_exist_ok=True,
    )

    # Set the generated project metadata before resolving its dependencies.
    pyproject = target / "pyproject.toml"
    pyproject.write_text(pyproject.read_text(encoding="utf-8").replace("__PROJECT_NAME__", project_name), encoding="utf-8")

    # Add provider-specific automation files only when explicitly requested.
    if ci_provider == "github":
        shutil.copytree(ROOT / ".static" / "ci" / "github", target, dirs_exist_ok=True)

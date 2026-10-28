import re
import shutil
import cyclopts
import importlib.metadata
from enum import StrEnum
from typing import Annotated
from pathlib import Path
from longlink.cli import errors
from longlink.constants import ROOT


class Provider(StrEnum):
    """Supported automation providers, matched case-insensitively by Cyclopts."""

    GITHUB = "github"


def init_command(
    *,
    folder: str | None = None,
    project_name: Annotated[str | None, cyclopts.Parameter(name="--name")] = None,
    ci_provider: Annotated[Provider | None, cyclopts.Parameter(name="--ci")] = None,
) -> None:
    """Initialize a new LongLink project.

    Parameters
    ----------
    folder
        Folder to initialize. Prompts when omitted; press Enter for the current directory.
    project_name
        Project name. Defaults to the folder name.
    ci_provider
        Add CI/CD provider files. Currently supported: github.

    """

    # Prompt only when the caller did not supply a target directory.
    if folder is None:
        folder = input("Enter folder name [.]: ") or "."

    # Resolve the requested target directory.
    target = Path(folder)
    project_name = project_name or target.resolve().name

    # Keep generated package metadata compatible with Python package conventions.
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", project_name):
        raise errors.Error(f"Invalid project name: {project_name}")

    # Select every scaffold before checking or copying any destination files.
    project_scaffold = ROOT / ".static" / "new"
    scaffolds = [project_scaffold]
    if ci_provider == Provider.GITHUB:
        scaffolds.append(ROOT / ".static" / "ci" / "github")

    # Reject conflicts across the complete scaffold plan before creating project files.
    if target.is_symlink() or (target.exists() and not target.is_dir()):
        raise errors.Error(f"Target is not a directory: {target}")
    if target.exists():
        for scaffold in scaffolds:

            # Reject every collision before copying any scaffold content.
            for source in scaffold.rglob("*"):
                destination = target / source.relative_to(scaffold)

                # Never overwrite existing project files or follow destination symlinks.
                if destination.is_symlink() or (destination.exists() and (source.is_file() or not destination.is_dir())):
                    raise errors.Error(f"Target already exists: {destination}")

    # Copy the validated plan while retaining the base scaffold's cache exclusions.
    for scaffold in scaffolds:
        shutil.copytree(
            scaffold,
            target,
            ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache", ".ruff_cache", ".venv") if scaffold == project_scaffold else None,
            dirs_exist_ok=True,
        )

    # Set the generated project metadata before resolving its dependencies.
    pyproject = target / "pyproject.toml"
    pyproject.write_text(pyproject.read_text(encoding="utf-8").replace("__PROJECT_NAME__", project_name), encoding="utf-8")

    # Stamp the generated instructions with the installed SDK version.
    agents = target / "AGENTS.md"
    agents.write_text(agents.read_text(encoding="utf-8").replace("<version>", importlib.metadata.version("longlink")), encoding="utf-8")

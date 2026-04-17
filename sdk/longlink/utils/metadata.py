import tomllib
from typing import Any, Literal
from pathlib import Path
from pydantic import Field, BaseModel


class Metadata(BaseModel):
    """LongLink app metadata model loaded from `pyproject.toml`."""

    name: str = "Sample LongLink app"
    version: str = "0.1.0"
    dependencies: list[str] = Field(default_factory=list)
    description: str = ""
    type: Literal["tool", "space", "process"] = "tool"


def _read_project_section(pyproject_path: Path) -> dict[str, Any]:
    """Read and return `project` section from a pyproject file."""

    with pyproject_path.open("rb") as pyproject_file:
        payload = tomllib.load(pyproject_file)

    project = payload.get("project")
    if not isinstance(project, dict):
        return {}
    return project


def load_metadata(pyproject_path: Path | None = None) -> Metadata:
    """Load app metadata from cwd `pyproject.toml` with safe defaults."""

    source_file = pyproject_path or (Path.cwd() / "pyproject.toml")
    if not source_file.exists():
        print("Warning: pyproject.toml is missing. Using default metadata values.")
        return Metadata()

    try:
        # Parse pyproject project table and map known keys into SDK metadata model.
        project = _read_project_section(source_file)
    except (tomllib.TOMLDecodeError, OSError):
        return Metadata()

    if not project:
        return Metadata()

    return Metadata.model_validate(
        {
            "name": project.get("name"),
            "version": project.get("version"),
            "dependencies": project.get("dependencies"),
            "description": project.get("description"),
        }
    )


metadata = load_metadata()

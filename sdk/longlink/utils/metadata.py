import tomllib
from typing import Self
from pathlib import Path
from pydantic import BaseModel

type MetadataPayload = dict[str, object]


class Metadata(BaseModel):
    """Project metadata loaded from `pyproject.toml` with sane defaults."""

    # Metadata
    name: str = "longlink-app"
    version: str = "0.0.0"
    description: str | None = None

    @classmethod
    def from_pyproject(cls, pyproject_data: MetadataPayload, **overrides: object) -> Self:
        """Build metadata from an already parsed pyproject payload."""

        # Read LongLink tool metadata first, then fall back to PEP 621 fields.
        tool_data = pyproject_data.get("tool")
        tool_data = tool_data.get("longlink") if isinstance(tool_data, dict) else None
        project_data = pyproject_data.get("project")
        tool_data = tool_data if isinstance(tool_data, dict) else {}
        project_data = project_data if isinstance(project_data, dict) else {}
        metadata_data = {
            field: value
            for field, value in {
                "name": tool_data.get("name") or project_data.get("name"),
                "description": tool_data.get("description") or project_data.get("description"),
                "version": tool_data.get("version") or project_data.get("version"),
            }.items()
            if value
        }

        # Let explicit constructor values win over parsed project metadata.
        metadata_data.update(overrides)
        return cls.model_validate(metadata_data)


def load_metadata(pyproject_path: Path | None = None, **overrides: object) -> Metadata:
    """Load metadata from pyproject location with optional explicit override values."""

    # Resolve a file path once and parse TOML from that location without changing cwd.
    resolved_pyproject = (pyproject_path or Path("pyproject.toml")).resolve()
    metadata_data: MetadataPayload = {}
    if resolved_pyproject.exists():

        # Keep file IO local to this resolved path.
        with resolved_pyproject.open("rb") as file_handle:
            metadata_data = tomllib.load(file_handle)

    return Metadata.from_pyproject(metadata_data, **overrides)

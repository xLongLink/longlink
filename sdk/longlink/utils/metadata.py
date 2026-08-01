import tomllib
from typing import Self
from pathlib import Path
from pydantic import BaseModel

type MetadataPayload = dict[str, object]


def metadata_section(data: MetadataPayload, name: str) -> MetadataPayload:
    """Return a string-keyed metadata section from parsed TOML data."""

    # Read the requested section while ignoring malformed TOML shapes.
    value = data.get(name)
    if not isinstance(value, dict):
        return {}

    return {key: entry for key, entry in value.items() if isinstance(key, str)}


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
        tool_data = metadata_section(metadata_section(pyproject_data, "tool"), "longlink")
        project_data = metadata_section(pyproject_data, "project")
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

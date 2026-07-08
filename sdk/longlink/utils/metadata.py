import tomllib
from typing import Any
from pathlib import Path
from pydantic import BaseModel


class Metadata(BaseModel):
    """Project metadata loaded from `pyproject.toml` with sane defaults."""

    # Metadata
    name: str = "longlink-app"
    title: str | None = None
    version: str = "0.0.0"
    summary: str | None = None
    contact: dict[str, Any] | None = None
    description: str | None = None
    license_info: dict[str, Any] | None = None
    terms_of_service: str | None = None

    @staticmethod
    def metadata_from_pyproject(pyproject_data: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
        """Extract metadata fields from parsed pyproject payload."""

        # Read LongLink tool section first, then fall back to standard PEP 621 fields.
        tool_data = pyproject_data.get("tool", {}).get("longlink", {})
        project_data = pyproject_data.get("project", {})
        return {
            "name": tool_data.get("name") or project_data.get("name") or defaults["name"],
            "title": tool_data.get("title") or defaults["title"],
            "summary": tool_data.get("summary") or defaults["summary"],
            "description": tool_data.get("description")
            or project_data.get("description")
            or defaults["description"],
            "version": tool_data.get("version") or project_data.get("version") or defaults["version"],
            "terms_of_service": tool_data.get("terms_of_service") or defaults["terms_of_service"],
            "contact": tool_data.get("contact") or defaults["contact"],
            "license_info": tool_data.get("license_info") or defaults["license_info"],
        }


def load_metadata(pyproject_path: Path | None = None, **overrides: Any) -> Metadata:
    """Load metadata from pyproject location with optional explicit override values."""

    resolved_pyproject = (pyproject_path or Path("pyproject.toml")).resolve()
    metadata_data: dict[str, Any] = {}

    # Resolve a file path once and parse TOML from that location without changing cwd.
    if resolved_pyproject.exists():
        with resolved_pyproject.open("rb") as file_handle:
            parsed_pyproject: dict[str, Any] = tomllib.load(file_handle)

        defaults = {field: Metadata.model_fields[field].default for field in Metadata.model_fields}
        metadata_data.update(Metadata.metadata_from_pyproject(parsed_pyproject, defaults))

    # Let explicit constructor values win over file-derived values.
    metadata_data.update(overrides)
    return Metadata(**metadata_data)

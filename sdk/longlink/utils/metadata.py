import tomllib
from typing import Any
from pathlib import Path
from pydantic import BaseModel, model_validator


class Metadata(BaseModel):
    """Project metadata loaded from `pyproject.toml` with sane defaults."""

    name: str = "longlink-app"
    title: str | None = None
    summary: str | None = None
    description: str | None = None
    version: str = "0.0.0"
    terms_of_service: str | None = None
    contact: dict[str, Any] | None = None
    license_info: dict[str, Any] | None = None

    @model_validator(mode="before")
    @classmethod
    def load_and_merge(cls, data: Any) -> dict[str, Any]:
        """Merge defaults, pyproject metadata, and explicit overrides into one payload."""

        data = data or {}

        # Start from model defaults so missing fields stay predictable.
        defaults = {field: cls.model_fields[field].default for field in cls.model_fields}
        result = dict(defaults)

        pyproject_data = data.pop("_pyproject_data", None)
        if isinstance(pyproject_data, dict):
            result.update(cls.metadata_from_pyproject(pyproject_data, result))

        # Let explicit constructor values win over file-derived values.
        result.update(data)
        return result

    @staticmethod
    def metadata_from_pyproject(
        pyproject_data: dict[str, Any],
        defaults: dict[str, Any],
    ) -> dict[str, Any]:
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
    parsed_pyproject: dict[str, Any] | None = None

    # Resolve a file path once and parse TOML from that location without changing cwd.
    if resolved_pyproject.exists():
        with resolved_pyproject.open("rb") as file_handle:
            parsed_pyproject = tomllib.load(file_handle)

    return Metadata(_pyproject_data=parsed_pyproject, **overrides)

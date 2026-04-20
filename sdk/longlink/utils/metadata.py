import os
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

        pyproject_path = Path("pyproject.toml")
        if pyproject_path.exists():
            with pyproject_path.open("rb") as file_handle:
                toml_data = tomllib.load(file_handle)

            # Read LongLink tool section first, then fall back to standard PEP 621 fields.
            tool_data = toml_data.get("tool", {}).get("longlink", {})
            project_data = toml_data.get("project", {})

            result.update(
                {
                    "name": tool_data.get("name") or project_data.get("name") or result["name"],
                    "title": tool_data.get("title") or result["title"],
                    "summary": tool_data.get("summary") or result["summary"],
                    "description": tool_data.get("description")
                    or project_data.get("description")
                    or result["description"],
                    "version": tool_data.get("version") or project_data.get("version") or result["version"],
                    "terms_of_service": tool_data.get("terms_of_service") or result["terms_of_service"],
                    "contact": tool_data.get("contact") or result["contact"],
                    "license_info": tool_data.get("license_info") or result["license_info"],
                }
            )

        # Let explicit constructor values win over file-derived values.
        result.update(data)
        return result


def load_metadata(pyproject_path: Path | None = None, **overrides: Any) -> Metadata:
    """Load metadata from pyproject location with optional explicit override values."""

    if pyproject_path is None:
        return Metadata(**overrides)

    cwd = Path.cwd()
    target_path = pyproject_path.resolve()

    # Pick root dir that contains pyproject file and load metadata from that context.
    project_root = target_path.parent if target_path.is_file() else target_path

    os.chdir(project_root)
    try:
        return Metadata(**overrides)
    finally:
        os.chdir(cwd)

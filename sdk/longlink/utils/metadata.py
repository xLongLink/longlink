import tomllib
from typing import Any, Literal
from pathlib import Path
from pydantic import BaseModel, model_validator


class Metadata(BaseModel):
    """Project metadata loaded from pyproject.toml with defaults and overrides."""

    title: str = "A LongLink App"
    summary: str | None = None
    description: str | None = None
    version: str = "0.0.0"
    terms_of_service: str | None = None
    contact: dict | None = None
    license_info: dict | None = None
    apptype: Literal["tool", "space", "process"] = ""

    @model_validator(mode="before")
    @classmethod
    def load_and_merge(cls, data: Any):
        data = data or {}

        # 1. Start from defaults (defined on the model)
        base = cls.model_fields

        result = {
            field: base[field].default
            for field in base
        }

        # 2. Load from pyproject.toml if present
        path = Path("pyproject.toml")
        if path.exists():
            with path.open("rb") as f:
                toml_data = tomllib.load(f)

            tool_data = toml_data.get("tool", {}).get("longlink", {})

            # Optional fallback to PEP 621 project metadata
            project = toml_data.get("project", {})

            result.update({
                "title": tool_data.get("title") or project.get("name"),
                "summary": tool_data.get("summary"),
                "description": tool_data.get("description") or project.get("description"),
                "version": tool_data.get("version") or project.get("version"),
                "terms_of_service": tool_data.get("terms_of_service"),
                "contact": tool_data.get("contact"),
                "license_info": tool_data.get("license_info"),
                "apptype": tool_data.get("apptype", result["apptype"]),
            })

        # 3. Explicit input overrides everything
        result.update(data)

        return result


metadata = Metadata()
import tomllib
from pathlib import Path
from pydantic import BaseModel

type MetadataPayload = dict[str, object]


def metadata_section(data: MetadataPayload, name: str) -> MetadataPayload:
    """Return a string-keyed metadata section from parsed TOML data."""

    value = data.get(name)

    # Ignore malformed or unexpected TOML section shapes.
    if not isinstance(value, dict):
        return {}

    return {key: entry for key, entry in value.items() if isinstance(key, str)}


class Metadata(BaseModel):
    """Project metadata loaded from `pyproject.toml` with sane defaults."""

    # Metadata
    name: str = "longlink-app"
    title: str | None = None
    version: str = "0.0.0"
    summary: str | None = None
    contact: MetadataPayload | None = None
    description: str | None = None
    license_info: MetadataPayload | None = None
    terms_of_service: str | None = None

    @staticmethod
    def metadata_from_pyproject(pyproject_data: MetadataPayload, defaults: MetadataPayload) -> MetadataPayload:
        """Extract metadata fields from parsed pyproject payload."""

        # Read LongLink tool section first, then fall back to standard PEP 621 fields.
        tool_data = metadata_section(metadata_section(pyproject_data, "tool"), "longlink")
        project_data = metadata_section(pyproject_data, "project")
        return {
            "name": tool_data.get("name") or project_data.get("name") or defaults["name"],
            "title": tool_data.get("title") or defaults["title"],
            "summary": tool_data.get("summary") or defaults["summary"],
            "description": tool_data.get("description") or project_data.get("description") or defaults["description"],
            "version": tool_data.get("version") or project_data.get("version") or defaults["version"],
            "terms_of_service": tool_data.get("terms_of_service") or defaults["terms_of_service"],
            "contact": tool_data.get("contact") or defaults["contact"],
            "license_info": tool_data.get("license_info") or defaults["license_info"],
        }


def load_metadata(pyproject_path: Path | None = None, **overrides: object) -> Metadata:
    """Load metadata from pyproject location with optional explicit override values."""

    resolved_pyproject = (pyproject_path or Path("pyproject.toml")).resolve()
    metadata_data: MetadataPayload = {}

    # Resolve a file path once and parse TOML from that location without changing cwd.
    if resolved_pyproject.exists():
        # Keep file IO local to this resolved path.
        with resolved_pyproject.open("rb") as file_handle:
            parsed_pyproject: MetadataPayload = tomllib.load(file_handle)

        defaults = {field: Metadata.model_fields[field].default for field in Metadata.model_fields}
        metadata_data.update(Metadata.metadata_from_pyproject(parsed_pyproject, defaults))

    # Let explicit constructor values win over file-derived values.
    metadata_data.update(overrides)
    return Metadata.model_validate(metadata_data)

import xmltodict
from typing import Any
from pathlib import Path


class Page:
    """Load and validate XML page documents from disk."""

    def __init__(self, path: str | Path) -> None:
        """Store XML file path for later parsing operations."""
        self.path = Path(path)

    @property
    def schema(self) -> dict[str, Any]:
        """Return full page document as a dict for downstream processing."""
        with self.path.open("rb", encoding="utf-8") as handler:
            content = handler.read()
            document = xmltodict.parse(content)
        return document
    
    @property
    def metadata(self) -> dict[str, str]:
        """Extract root metadata fields from XML page schema."""

        metadata: dict[str, str] = {}
        # Pull supported metadata attrs from root element and normalize whitespace.
        for key in ("name", "icon"):
            root: dict[str, Any] = self.schema.get("Page", {})
            value = root.get(f"@{key}") or root.get(key)
            if isinstance(value, str) and value.strip():
                metadata[key] = value.strip()

        return metadata

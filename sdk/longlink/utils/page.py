import xmltodict
from lxml import etree
from typing import Any
from pathlib import Path
from importlib import resources


class Page:
    """Load and validate XML page documents from disk.
    Pages are discovered through app metadata and can be used to define custom UI components and interactions.
    """

    def __init__(self, path: str | Path) -> None:
        """Store XML file path for later parsing operations."""
        self.path = Path(path)
        self._content: str | None = None
        self._schema: dict[str, Any] | None = None

    @property
    def name(self) -> str:
        """Return page name from metadata."""
        return self.metadata.get("name", self.path.stem)

    @property
    def content(self) -> str:
        """Return raw XML text for delivery to the web runtime."""
        if self._content is None:
            with self.path.open("r", encoding="utf-8") as handler:
                self._content = handler.read()
        return self._content

    def validate(self) -> None:
        """Validate the XML document against the packaged XSD schema."""

        schema_path = resources.files("longlink").joinpath(".static/schema.xsd")
        schema_root = etree.XML(schema_path.read_bytes())
        schema = etree.XMLSchema(schema_root)

        xml_doc = etree.XML(self.content.encode("utf-8"))
        if not schema.validate(xml_doc):
            messages = [f"Line {error.line}: {error.message}" for error in schema.error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

    @property
    def schema(self) -> dict[str, Any]:
        """Return full page document as a dict for downstream processing."""
        if self._schema is None:
            self._schema = xmltodict.parse(self.content)
        return self._schema

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

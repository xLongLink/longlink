from __future__ import annotations

import xmltodict
from lxml import etree
from typing import Any
from pathlib import Path

from longlink.constants import ROOT


class Element:
    """Load XML content from disk and validate it against an XSD schema."""

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store file paths and defer parsing until needed."""

        self.path = Path(path)
        self.schema_path = Path(schema) if schema is not None else ROOT / ".static" / "xsd" / "schema.xsd"
        self._content: str | None = None

    @classmethod
    def from_content(cls, content: str, schema: str | Path | None = None) -> Element:
        """Create an element instance from in-memory XML content."""

        instance = cls.__new__(cls)
        instance.path = Path("<memory>")
        instance.schema_path = Path(schema) if schema is not None else None
        instance._content = content
        return instance

    @property
    def content(self) -> str:
        """Return the raw XML payload."""

        if self._content is None:
            with self.path.open("r", encoding="utf-8") as handler:
                self._content = handler.read()
        return self._content

    def validate(self) -> None:
        """Validate the XML document against the configured XSD schema."""

        schema_doc = etree.parse(str(self._schema_file_path()))
        schema = etree.XMLSchema(schema_doc)
        xml_doc = etree.XML(self.content.encode("utf-8"))
        if not schema.validate(xml_doc):
            messages = [f"Line {error.line}: {error.message}" for error in schema.error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

    def _schema_file_path(self) -> Path:
        """Resolve the XSD file path for validation."""

        if self.schema_path is None:
            raise ValueError("No XSD schema path configured")

        return self.schema_path

    def _load_schema_bytes(self) -> bytes:
        """Load schema bytes from the configured path or package resources."""

        return self._schema_file_path().read_bytes()


class Page(Element):
    """Load and validate XML page documents from disk.
    Pages are discovered through app metadata and can be used to define custom UI components and interactions.
    """

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store XML file path and page schema for later parsing operations."""

        default_schema = schema or ".static/xsd/schema.xsd"
        super().__init__(path=path, schema=default_schema)
        self._schema: dict[str, Any] | None = None

    @property
    def name(self) -> str:
        """Return page name from metadata."""

        return self.metadata.get("name", self.path.stem)

    @property
    def content(self) -> str:
        """Return raw XML text for delivery to the web runtime."""

        return super().content

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

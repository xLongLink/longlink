from __future__ import annotations

import xmltodict
from lxml import etree
from pathlib import Path
from src.constants import ROOT


class Page:
    """Load and validate XML page documents from disk."""

    def __init__(self, path: str | Path, schema: str | Path | None = None) -> None:
        """Store the page path and optional schema path."""

        self.path = Path(path)
        self.schema_path = Path(schema) if schema is not None else ROOT.parent.parent / "sdk" / "longlink" / ".static" / "xsd" / "schema.xsd"
        self._content: str | None = None
        self._schema: dict[str, object] | None = None

    @property
    def content(self) -> str:
        """Return the raw XML payload."""

        if self._content is None:
            self._content = self.path.read_text(encoding="utf-8")
        return self._content

    @property
    def schema(self) -> dict[str, object]:
        """Return the XML document as a dictionary."""

        if self._schema is None:
            self._schema = xmltodict.parse(self.content)
        return self._schema

    @property
    def metadata(self) -> dict[str, str]:
        """Extract supported metadata from the root element."""

        metadata: dict[str, str] = {}
        root = self.schema.get("Page", {})
        if not isinstance(root, dict):
            return metadata

        for key in ("name", "icon"):
            value = root.get(f"@{key}") or root.get(key)
            if isinstance(value, str) and value.strip():
                metadata[key] = value.strip()

        return metadata

    def validate(self) -> None:
        """Validate the XML document against the configured XSD schema."""

        schema_doc = etree.parse(str(self.schema_path))
        schema = etree.XMLSchema(schema_doc)
        xml_doc = etree.fromstring(self.content.encode("utf-8"))
        if not schema.validate(xml_doc):
            messages = [f"Line {error.line}: {error.message}" for error in schema.error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

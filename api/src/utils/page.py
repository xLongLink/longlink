from __future__ import annotations

import xmltodict
from lxml import etree
from typing import Any
from pathlib import Path
from importlib import resources
from xml.parsers.expat import ExpatError


class Page:
    """Load and parse XML page definitions stored on disk."""

    def __init__(self, path: str | Path) -> None:
        """Initialize page helper with a file path."""
        self.path = Path(path)
        self._content: str | None = None
        self._schema: dict[str, Any] | None = None

    @property
    def content(self) -> str:
        """Return raw XML content."""
        if self._content is None:
            with self.path.open("r", encoding="utf-8") as file:
                self._content = file.read()
        return self._content

    @property
    def schema(self) -> dict[str, Any]:
        """Return parsed XML schema using xmltodict."""
        if self._schema is None:
            try:
                self._schema = xmltodict.parse(self.content)
            except ExpatError:
                self._schema = {}
        return self._schema

    @property
    def metadata(self) -> dict[str, str]:
        """Extract normalized metadata from the root <Page> element."""
        page_node = self.schema.get("Page") or self.schema.get("iPage")
        if not isinstance(page_node, dict):
            return {}

        metadata: dict[str, str] = {}

        # Normalize root attributes from xmltodict keys such as @name and @icon.
        for key, value in page_node.items():
            if not key.startswith("@") or not isinstance(value, str):
                continue
            normalized_value = value.strip()
            if not normalized_value:
                continue
            metadata[key.removeprefix("@").lower()] = normalized_value

        return metadata

    def validate(self) -> None:
        """Validate the XML document against the packaged XSD schema."""
        schema_path = resources.files("longlink").joinpath(".static/schema.xsd")
        schema_root = etree.XML(schema_path.read_bytes())
        schema = etree.XMLSchema(schema_root)

        xml_doc = etree.XML(self.content.encode("utf-8"))
        if not schema.validate(xml_doc):
            messages = [f"Line {error.line}: {error.message}" for error in schema.error_log]
            raise ValueError("XML is invalid: " + "; ".join(messages))

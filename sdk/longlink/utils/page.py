import xmltodict
from pathlib import Path
from typing import Any


class Page:
    """Load and validate XML page documents from disk."""

    def __init__(self, path: str | Path) -> None:
        """Store XML file path for later parsing operations."""
        self.path = Path(path)

    def load_page_schema(self) -> str:
        """Load XML page schema text and validate root element."""

        content = self.path.read_text(encoding="utf-8")
        # Parse document to ensure XML is valid and has expected root element.
        document = xmltodict.parse(content)
        self._get_page_root(document)
        return content

    def load_page_metadata(self) -> dict[str, str]:
        """Extract root metadata fields from XML page schema."""

        document = self._read_document()
        root = self._get_page_root(document)

        metadata: dict[str, str] = {}
        # Pull supported metadata attrs from root element and normalize whitespace.
        for key in ("name", "icon"):
            value = root.get(f"@{key}") or root.get(key)
            if isinstance(value, str) and value.strip():
                metadata[key] = value.strip()

        return metadata

    def _read_document(self) -> dict[str, Any]:
        """Read and parse XML file into dictionary form."""

        content = self.path.read_text(encoding="utf-8")
        return xmltodict.parse(content)

    @staticmethod
    def _get_page_root(document: dict[str, Any]) -> dict[str, Any]:
        """Return XML root object for Page documents."""

        root = document.get("Page")
        # Enforce expected root element for page schema documents.
        if not isinstance(root, dict):
            raise ValueError("XML page document must contain a <Page> root element.")

        return root

"""XML helper utilities for LongLink page definitions."""

import xmltodict
from typing import Any
from pathlib import Path


def load_page_schema_from_xml(path: str | Path) -> str:
    """Load XML page schema text and validate root element."""

    content = Path(path).read_text(encoding="utf-8")
    document = xmltodict.parse(content)
    _get_page_root(document)
    return content


def load_page_metadata_from_xml(path: str | Path) -> dict[str, str]:
    """Extract root metadata fields from XML page schema."""

    document = xmltodict.parse(Path(path).read_text(encoding="utf-8"))
    root = _get_page_root(document)

    metadata: dict[str, str] = {}
    # Pull supported metadata attrs from root element and normalize whitespace.
    for key in ("name", "icon"):
        value = root.get(f"@{key}") or root.get(key)
        if isinstance(value, str) and value.strip():
            metadata[key] = value.strip()

    return metadata


def _get_page_root(document: dict[str, Any]) -> dict[str, Any]:
    """Return XML root object for Page documents."""

    root = document.get("Page")
    if not isinstance(root, dict):
        raise ValueError("XML page document must contain a <Page> root element.")

    return root

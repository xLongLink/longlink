from pytest import MonkeyPatch
from typing import Any
from pathlib import Path
from longlink.utils import xml as xml_utils
from longlink.constants import ROOT
from longlink.utils.xml import Element, Longlink

SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"


def test_element_validates_file_and_memory_xml(tmp_path: Path) -> None:
    """Validate XML from disk and from in-memory content against XSD."""

    # Arrange
    content = '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>'
    page_path = tmp_path / "dashboard.xml"
    page_path.write_text(content, encoding="utf-8")
    file_element = Element(page_path, schema=SCHEMA)
    memory_element = Element.from_content(content, schema=SCHEMA)

    # Act and assert
    file_element.validate()
    memory_element.validate()


def test_element_validation_uses_safe_xml_parser(monkeypatch: MonkeyPatch) -> None:
    """Disable DTD loading, network access, and entity resolution during validation."""

    # Arrange
    captured_kwargs: list[dict[str, object]] = []
    original_parser = xml_utils.etree.XMLParser

    def fake_xml_parser(*args: Any, **kwargs: Any) -> object:
        """Capture parser security options while preserving parser behavior."""

        captured_kwargs.append(kwargs)
        return original_parser(*args, **kwargs)

    monkeypatch.setattr(xml_utils.etree, "XMLParser", fake_xml_parser)

    # Act
    Element.from_content("<longlink />", schema=SCHEMA).validate()

    # Assert
    assert captured_kwargs[0]["load_dtd"] is False
    assert captured_kwargs[0]["no_network"] is True
    assert captured_kwargs[0]["resolve_entities"] is False


def test_longlink_metadata_parses_xml_document(tmp_path: Path) -> None:
    """Parse `<longlink>` XML metadata from a document file."""

    # Arrange
    page_path = tmp_path / "dashboard.xml"
    page_path.write_text(
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>',
        encoding="utf-8",
    )

    # Act
    metadata = Longlink(page_path).metadata

    # Assert
    assert metadata["longlink"]["@name"] == "Dashboard"
    assert metadata["longlink"]["@icon"] == "layout-dashboard"

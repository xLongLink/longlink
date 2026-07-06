from pytest import MonkeyPatch
from typing import Any
from longlink.utils import xml as xml_utils
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"
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

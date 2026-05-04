"""Tests for the `Textarea` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Textarea.xsd"


def test_textarea_validation() -> None:
    """Validate a minimal `Textarea` fragment."""

    element = Element.from_content('<Textarea name="notes">Draft notes</Textarea>', schema=SCHEMA)
    element.validate()


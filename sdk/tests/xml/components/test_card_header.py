"""Tests for the `CardHeader` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardHeader.xsd"


def test_card_header_validation() -> None:
    """Validate a minimal `CardHeader` fragment."""

    element = Element.from_content('<CardHeader><CardTitle>Title</CardTitle></CardHeader>', schema=SCHEMA)
    element.validate()


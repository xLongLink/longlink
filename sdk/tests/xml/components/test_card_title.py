"""Tests for the `CardTitle` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardTitle.xsd"


def test_card_title_validation() -> None:
    """Validate a minimal `CardTitle` fragment."""

    element = Element.from_content('<CardTitle>Title</CardTitle>', schema=SCHEMA)
    element.validate()


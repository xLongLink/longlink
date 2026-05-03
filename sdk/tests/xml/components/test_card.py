"""Tests for the `Card` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Card.xsd"


def test_card_validation() -> None:
    """Validate a minimal `Card` fragment."""

    element = Element.from_content('<Card><CardHeader /><CardContent /></Card>', schema=SCHEMA)
    element.validate()


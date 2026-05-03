"""Tests for the `CardContent` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardContent.xsd"


def test_card_content_validation() -> None:
    """Validate a minimal `CardContent` fragment."""

    element = Element.from_content('<CardContent><p>Details</p></CardContent>', schema=SCHEMA)
    element.validate()


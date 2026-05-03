"""Tests for the `CardDescription` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardDescription.xsd"


def test_card_description_validation() -> None:
    """Validate a minimal `CardDescription` fragment."""

    element = Element.from_content('<CardDescription>Summary</CardDescription>', schema=SCHEMA)
    element.validate()


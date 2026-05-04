"""Tests for the `CardFooter` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardFooter.xsd"


def test_card_footer_validation() -> None:
    """Validate a minimal `CardFooter` fragment."""

    element = Element.from_content('<CardFooter><Button>Close</Button></CardFooter>', schema=SCHEMA)
    element.validate()


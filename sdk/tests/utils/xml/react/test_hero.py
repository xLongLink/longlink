"""Tests for the `Hero` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Hero.xsd"


def test_hero_validation() -> None:
    """Validate a minimal `Hero` fragment."""

    element = Element.from_content('<Hero><h1>Headline</h1></Hero>', schema=SCHEMA)
    element.validate()

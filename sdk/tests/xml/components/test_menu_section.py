"""Tests for the `MenuSection` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "MenuSection.xsd"


def test_menu_section_validation() -> None:
    """Validate a minimal `MenuSection` fragment."""

    element = Element.from_content('<MenuSection><MenuSubSection /></MenuSection>', schema=SCHEMA)
    element.validate()


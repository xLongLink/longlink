"""Tests for the `MenuSubSection` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "MenuSubSection.xsd"


def test_menu_sub_section_validation() -> None:
    """Validate a minimal `MenuSubSection` fragment."""

    element = Element.from_content("<MenuSubSection />", schema=SCHEMA)
    element.validate()


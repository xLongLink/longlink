"""Tests for the `Menu` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Menu.xsd"


def test_menu_validation() -> None:
    """Validate a minimal `Menu` fragment."""

    element = Element.from_content('<Menu><MenuSection /></Menu>', schema=SCHEMA)
    element.validate()


def test_menu_section_validation() -> None:
    """Validate a minimal `MenuSection` fragment."""

    element = Element.from_content('<MenuSection />', schema=SCHEMA)
    element.validate()


def test_menu_sub_section_validation() -> None:
    """Validate a minimal `MenuSubSection` fragment."""

    element = Element.from_content('<MenuSubSection />', schema=SCHEMA)
    element.validate()

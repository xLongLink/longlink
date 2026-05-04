"""Tests for the `Menu` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Menu.xsd"


def test_menu_validation() -> None:
    """Validate a minimal `Menu` fragment."""

    element = Element.from_content('<Menu><MenuSection /></Menu>', schema=SCHEMA)
    element.validate()


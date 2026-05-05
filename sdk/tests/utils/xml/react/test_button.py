"""Tests for the `Button` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Button.xsd"


def test_button_validation() -> None:
    """Validate a minimal `Button` fragment."""

    element = Element.from_content('<Button action="save">Save</Button>', schema=SCHEMA)
    element.validate()

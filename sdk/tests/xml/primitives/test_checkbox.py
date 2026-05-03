"""Tests for the `Checkbox` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Checkbox.xsd"


def test_checkbox_validation() -> None:
    """Validate a minimal `Checkbox` fragment."""

    element = Element.from_content('<Checkbox checked="true">Enable</Checkbox>', schema=SCHEMA)
    element.validate()


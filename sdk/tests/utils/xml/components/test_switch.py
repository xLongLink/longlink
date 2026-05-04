"""Tests for the `Switch` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Switch.xsd"


def test_switch_validation() -> None:
    """Validate a minimal `Switch` fragment."""

    element = Element.from_content('<Switch name="enabled" />', schema=SCHEMA)
    element.validate()


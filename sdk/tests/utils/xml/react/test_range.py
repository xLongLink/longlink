"""Tests for the `Range` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Range.xsd"


def test_range_validation() -> None:
    """Validate a minimal `Range` fragment."""

    element = Element.from_content('<Range name="volume" value="50" />', schema=SCHEMA)
    element.validate()

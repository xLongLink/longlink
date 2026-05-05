"""Tests for the `Slider` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Slider.xsd"


def test_slider_validation() -> None:
    """Validate a minimal `Slider` fragment."""

    element = Element.from_content('<Slider name="progress" value="25" />', schema=SCHEMA)
    element.validate()

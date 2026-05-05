"""Tests for the `Icon` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Icon.xsd"


def test_icon_validation() -> None:
    """Validate a minimal `Icon` fragment."""

    element = Element.from_content('<Icon name="sparkles" />', schema=SCHEMA)
    element.validate()

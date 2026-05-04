"""Tests for the `Separator` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Separator.xsd"


def test_separator_validation() -> None:
    """Validate a minimal `Separator` fragment."""

    element = Element.from_content("<Separator />", schema=SCHEMA)
    element.validate()


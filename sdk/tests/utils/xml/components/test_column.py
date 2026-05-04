"""Tests for the `Column` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Column.xsd"


def test_column_validation() -> None:
    """Validate a minimal `Column` fragment."""

    element = Element.from_content('<Column><p>Body</p></Column>', schema=SCHEMA)
    element.validate()


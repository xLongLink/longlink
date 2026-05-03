"""Tests for the `Columns` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Columns.xsd"


def test_columns_validation() -> None:
    """Validate a minimal `Columns` fragment."""

    element = Element.from_content('<Columns><Column /></Columns>', schema=SCHEMA)
    element.validate()


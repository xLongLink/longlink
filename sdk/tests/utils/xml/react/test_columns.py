"""Tests for the `Columns` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Columns.xsd"


def test_columns_validation() -> None:
    """Validate a minimal `Columns` fragment."""

    element = Element.from_content('<Columns><Column /></Columns>', schema=SCHEMA)
    element.validate()


def test_column_validation() -> None:
    """Validate a minimal `Column` fragment."""

    element = Element.from_content('<Column />', schema=SCHEMA)
    element.validate()

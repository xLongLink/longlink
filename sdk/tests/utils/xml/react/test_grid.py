"""Tests for the `Grid` XML schema."""

from __future__ import annotations

from lxml import etree
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[4] / "longlink" / ".static" / "xsd" / "react" / "Grid.xsd"


def test_grid_validation() -> None:
    """Validate a minimal `Grid` fragment."""

    schema = etree.XMLSchema(etree.parse(str(SCHEMA)))
    element = etree.fromstring(b'<Grid><Card /></Grid>')

    assert schema.validate(element)

"""Tests for the `Select` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Select.xsd"


def test_select_validation() -> None:
    """Validate a minimal `Select` fragment."""

    element = Element.from_content('<Select name="status"><option>Open</option></Select>', schema=SCHEMA)
    element.validate()


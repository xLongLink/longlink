"""Tests for the `br` HTML fragment schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "br.xsd"


def test_br_validation() -> None:
    """Validate a plain break fragment."""

    element = Element.from_content("<br />", schema=SCHEMA)
    element.validate()

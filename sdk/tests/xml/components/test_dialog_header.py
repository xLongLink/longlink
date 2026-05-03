"""Tests for the `DialogHeader` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogHeader.xsd"


def test_dialog_header_validation() -> None:
    """Validate a minimal `DialogHeader` fragment."""

    element = Element.from_content('<DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>', schema=SCHEMA)
    element.validate()


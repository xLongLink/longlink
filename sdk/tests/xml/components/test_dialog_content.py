"""Tests for the `DialogContent` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogContent.xsd"


def test_dialog_content_validation() -> None:
    """Validate a minimal `DialogContent` fragment."""

    element = Element.from_content('<DialogContent><DialogTitle>Title</DialogTitle></DialogContent>', schema=SCHEMA)
    element.validate()


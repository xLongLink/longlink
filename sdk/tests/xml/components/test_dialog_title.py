"""Tests for the `DialogTitle` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogTitle.xsd"


def test_dialog_title_validation() -> None:
    """Validate a minimal `DialogTitle` fragment."""

    element = Element.from_content('<DialogTitle>Title</DialogTitle>', schema=SCHEMA)
    element.validate()


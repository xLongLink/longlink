"""Tests for the `DialogFooter` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogFooter.xsd"


def test_dialog_footer_validation() -> None:
    """Validate a minimal `DialogFooter` fragment."""

    element = Element.from_content('<DialogFooter><Button>Save</Button></DialogFooter>', schema=SCHEMA)
    element.validate()


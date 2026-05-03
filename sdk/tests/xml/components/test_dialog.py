"""Tests for the `Dialog` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Dialog.xsd"


def test_dialog_validation() -> None:
    """Validate a minimal `Dialog` fragment."""

    element = Element.from_content('<Dialog><DialogContent /></Dialog>', schema=SCHEMA)
    element.validate()


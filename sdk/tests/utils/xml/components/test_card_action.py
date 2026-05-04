"""Tests for the `CardAction` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "CardAction.xsd"


def test_card_action_validation() -> None:
    """Validate a minimal `CardAction` fragment."""

    element = Element.from_content('<CardAction action="save">Save</CardAction>', schema=SCHEMA)
    element.validate()


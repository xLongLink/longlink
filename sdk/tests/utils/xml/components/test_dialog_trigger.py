"""Tests for the `DialogTrigger` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogTrigger.xsd"


def test_dialog_trigger_validation() -> None:
    """Validate a minimal `DialogTrigger` fragment."""

    element = Element.from_content('<DialogTrigger action="open">Open</DialogTrigger>', schema=SCHEMA)
    element.validate()


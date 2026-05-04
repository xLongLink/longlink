"""Tests for the `DialogDescription` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "DialogDescription.xsd"


def test_dialog_description_validation() -> None:
    """Validate a minimal `DialogDescription` fragment."""

    element = Element.from_content('<DialogDescription>Details</DialogDescription>', schema=SCHEMA)
    element.validate()


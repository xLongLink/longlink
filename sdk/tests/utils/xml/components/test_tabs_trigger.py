"""Tests for the `TabsTrigger` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "TabsTrigger.xsd"


def test_tabs_trigger_validation() -> None:
    """Validate a minimal `TabsTrigger` fragment."""

    element = Element.from_content('<TabsTrigger value="one">One</TabsTrigger>', schema=SCHEMA)
    element.validate()


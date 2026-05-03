"""Tests for the `Tabs` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Tabs.xsd"


def test_tabs_validation() -> None:
    """Validate a minimal `Tabs` fragment."""

    element = Element.from_content('<Tabs><TabsList /><TabsContent /></Tabs>', schema=SCHEMA)
    element.validate()


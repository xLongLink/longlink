"""Tests for the `Tabs` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Tabs.xsd"


def test_tabs_validation() -> None:
    """Validate a minimal `Tabs` fragment."""

    element = Element.from_content('<Tabs><TabsList /><TabsContent /></Tabs>', schema=SCHEMA)
    element.validate()


def test_tabs_content_validation() -> None:
    """Validate a minimal `TabsContent` fragment."""

    element = Element.from_content('<TabsContent />', schema=SCHEMA)
    element.validate()


def test_tabs_list_validation() -> None:
    """Validate a minimal `TabsList` fragment."""

    element = Element.from_content('<TabsList />', schema=SCHEMA)
    element.validate()


def test_tabs_trigger_validation() -> None:
    """Validate a minimal `TabsTrigger` fragment."""

    element = Element.from_content('<TabsTrigger />', schema=SCHEMA)
    element.validate()

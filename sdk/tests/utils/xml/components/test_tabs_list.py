"""Tests for the `TabsList` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "TabsList.xsd"


def test_tabs_list_validation() -> None:
    """Validate a minimal `TabsList` fragment."""

    element = Element.from_content('<TabsList><TabsTrigger /></TabsList>', schema=SCHEMA)
    element.validate()


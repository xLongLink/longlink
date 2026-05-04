"""Tests for the `TabsContent` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "TabsContent.xsd"


def test_tabs_content_validation() -> None:
    """Validate a minimal `TabsContent` fragment."""

    element = Element.from_content('<TabsContent>Content</TabsContent>', schema=SCHEMA)
    element.validate()


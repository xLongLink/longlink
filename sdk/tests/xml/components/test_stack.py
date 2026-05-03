"""Tests for the `Stack` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "components" / "Stack.xsd"


def test_stack_validation() -> None:
    """Validate a minimal `Stack` fragment."""

    element = Element.from_content('<Stack><Card /></Stack>', schema=SCHEMA)
    element.validate()


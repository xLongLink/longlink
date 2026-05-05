"""Tests for the `Input` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Input.xsd"


def test_input_validation() -> None:
    """Validate a minimal `Input` fragment."""

    element = Element.from_content('<Input name="title" value="Draft" />', schema=SCHEMA)
    element.validate()

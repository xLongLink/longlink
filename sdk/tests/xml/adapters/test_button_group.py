"""Tests for the `ButtonGroup` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "ButtonGroup.xsd"
TEXT_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "ButtonGroupText.xsd"
SEPARATOR_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "ButtonGroupSeparator.xsd"


def test_button_group_validation() -> None:
    """Validate a compound `ButtonGroup` fragment."""

    element = Element.from_content(
        '<ButtonGroup orientation="horizontal"><Button variant="outline">Cancel</Button><Input value="Search" /><ButtonGroupSeparator orientation="vertical" /><ButtonGroupText>Quick actions</ButtonGroupText></ButtonGroup>',
        schema=SCHEMA,
    )
    element.validate()


def test_button_group_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `ButtonGroup`."""

    element = Element.from_content('<ButtonGroup tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_button_group_text_validation() -> None:
    """Validate a minimal `ButtonGroupText` fragment."""

    element = Element.from_content('<ButtonGroupText>Quick actions</ButtonGroupText>', schema=TEXT_SCHEMA)
    element.validate()


def test_button_group_separator_validation() -> None:
    """Validate a minimal `ButtonGroupSeparator` fragment."""

    element = Element.from_content('<ButtonGroupSeparator orientation="horizontal" />', schema=SEPARATOR_SCHEMA)
    element.validate()

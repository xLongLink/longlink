"""Tests for the `InputGroup` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroup.xsd"
ADDON_SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroupAddon.xsd"
BUTTON_SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroupButton.xsd"
TEXT_SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroupText.xsd"
INPUT_SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroupInput.xsd"
TEXTAREA_SCHEMA = ROOT / ".static" / "xsd" / "react" / "InputGroupTextarea.xsd"


def test_input_group_validation() -> None:
    """Validate a compound `InputGroup` fragment."""

    element = Element.from_content(
        (
            '<InputGroup><InputGroupAddon>@</InputGroupAddon><InputGroupInput label="Handle" '
            'value="user.handle" /><InputGroupButton type="button">Search</InputGroupButton>'
            '<InputGroupText>Public</InputGroupText></InputGroup>'
        ),
        schema=SCHEMA,
    )
    element.validate()


def test_input_group_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `InputGroup`."""

    element = Element.from_content('<InputGroup tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_input_group_addon_validation() -> None:
    """Validate a minimal `InputGroupAddon` fragment."""

    element = Element.from_content('<InputGroupAddon align="inline-end">@</InputGroupAddon>', schema=ADDON_SCHEMA)
    element.validate()


def test_input_group_button_validation() -> None:
    """Validate a minimal `InputGroupButton` fragment."""

    element = Element.from_content(
        '<InputGroupButton size="xs" variant="ghost" type="submit">Save</InputGroupButton>',
        schema=BUTTON_SCHEMA,
    )
    element.validate()


def test_input_group_text_validation() -> None:
    """Validate a minimal `InputGroupText` fragment."""

    element = Element.from_content('<InputGroupText>Public</InputGroupText>', schema=TEXT_SCHEMA)
    element.validate()


def test_input_group_input_validation() -> None:
    """Validate a minimal `InputGroupInput` fragment."""

    element = Element.from_content(
        '<InputGroupInput label="Handle" value="user.handle" type="text" if="canEdit" />',
        schema=INPUT_SCHEMA,
    )
    element.validate()


def test_input_group_textarea_validation() -> None:
    """Validate a minimal `InputGroupTextarea` fragment."""

    element = Element.from_content(
        '<InputGroupTextarea label="Notes" rows="4" cols="40" value="Draft notes" />',
        schema=TEXTAREA_SCHEMA,
    )
    element.validate()

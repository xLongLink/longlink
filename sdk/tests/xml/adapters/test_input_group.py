import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroup.xsd"
ADDON_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroupAddon.xsd"
BUTTON_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroupButton.xsd"
TEXT_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroupText.xsd"
INPUT_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroupInput.xsd"
TEXTAREA_SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "InputGroupTextarea.xsd"


def test_input_group_validation() -> None:
    """Validate a compound `InputGroup` fragment."""

    element = Element.from_content(
        (
            '<InputGroup><InputGroupAddon><P i18n="@" /></InputGroupAddon><InputGroupInput label="Handle" '
            'value="user.handle" /><InputGroupButton type="button" i18n="Search" />'
            '<InputGroupText i18n="Public" /></InputGroup>'
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

    element = Element.from_content('<InputGroupAddon align="inline-end"><P i18n="@" /></InputGroupAddon>', schema=ADDON_SCHEMA)
    element.validate()


def test_input_group_button_validation() -> None:
    """Validate a minimal `InputGroupButton` fragment."""

    element = Element.from_content(
        '<InputGroupButton size="xs" variant="ghost" type="submit" i18n="Save" />',
        schema=BUTTON_SCHEMA,
    )
    element.validate()


def test_input_group_text_validation() -> None:
    """Validate a minimal `InputGroupText` fragment."""

    element = Element.from_content('<InputGroupText i18n="Public" />', schema=TEXT_SCHEMA)
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

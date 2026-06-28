import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Textarea.xsd"


def test_textarea_validation() -> None:
    """Validate a minimal `Textarea` fragment."""

    element = Element.from_content('<Textarea label="Notes" rows="4" cols="40" value="Draft notes" if="canEdit" />', schema=SCHEMA)
    element.validate()


def test_textarea_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Textarea`."""

    element = Element.from_content('<Textarea tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

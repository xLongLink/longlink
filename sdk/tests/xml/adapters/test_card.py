import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Card.xsd"


def test_card_validation() -> None:
    """Validate a simplified `Card` fragment."""

    element = Element.from_content(
        '<Card><P i18n="Card Content" /></Card>',
        schema=SCHEMA,
    )
    element.validate()


def test_card_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Card`."""

    element = Element.from_content('<Card tone="accent"><P i18n="Revenue" /></Card>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

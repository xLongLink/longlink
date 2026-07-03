import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Flex.xsd"


def test_flex_validation() -> None:
    """Validate a minimal `Flex` layout fragment."""

    element = Element.from_content('<Flex space="between"><P i18n="Name" /><Badge i18n="Live" /></Flex>', schema=SCHEMA)
    element.validate()


def test_flex_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Flex`."""

    element = Element.from_content('<Flex tone="accent"><P i18n="Name" /></Flex>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_flex_rejects_unknown_space_values() -> None:
    """Reject unsupported flex spacing values."""

    element = Element.from_content('<Flex space="stretch"><P i18n="Name" /></Flex>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

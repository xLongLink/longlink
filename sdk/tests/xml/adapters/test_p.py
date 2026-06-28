import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "p.xsd"


def test_p_page_validation() -> None:
    """Validate a plain `P` fragment."""

    element = Element.from_content('<P i18n="Paragraph text" />', schema=SCHEMA)
    element.validate()


def test_p_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `P`."""

    element = Element.from_content('<P data-testid="body-copy" i18n="Paragraph text" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_p_allows_if_attribute() -> None:
    """Allow the schema-supported `if` attribute on `P`."""

    element = Element.from_content('<P if="show" i18n="Paragraph text" />', schema=SCHEMA)
    element.validate()


def test_p_allows_i18n_attribute() -> None:
    """Allow localized text to resolve from the bundled catalog."""

    element = Element.from_content('<P i18n="copy.paragraph" />', schema=SCHEMA)
    element.validate()


def test_p_rejects_lowercase_tag() -> None:
    """Reject lowercase `p` tags in HTML bridge XML."""

    element = Element.from_content('<p i18n="Paragraph text" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

"""Tests for the `p` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "p.xsd"


def test_p_page_validation() -> None:
    """Validate a plain `p` fragment."""

    element = Element.from_content("<p>Paragraph text</p>", schema=SCHEMA)
    element.validate()


def test_p_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `p`."""

    element = Element.from_content('<p data-testid="body-copy">Paragraph text</p>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_p_allows_if_attribute() -> None:
    """Allow the schema-supported `if` attribute on `p`."""

    element = Element.from_content('<p if="show">Paragraph text</p>', schema=SCHEMA)
    element.validate()


def test_p_rejects_uppercase_tag() -> None:
    """Reject uppercase `P` tags in HTML bridge XML."""

    element = Element.from_content('<P>Paragraph text</P>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

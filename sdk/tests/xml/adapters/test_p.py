"""Tests for the `P` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "p.xsd"


def test_p_page_validation() -> None:
    """Validate a plain `P` fragment."""

    element = Element.from_content("<P>Paragraph text</P>", schema=SCHEMA)
    element.validate()


def test_p_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `P`."""

    element = Element.from_content('<P data-testid="body-copy">Paragraph text</P>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_p_allows_if_attribute() -> None:
    """Allow the schema-supported `if` attribute on `P`."""

    element = Element.from_content('<P if="show">Paragraph text</P>', schema=SCHEMA)
    element.validate()


def test_p_rejects_lowercase_tag() -> None:
    """Reject lowercase `p` tags in HTML bridge XML."""

    element = Element.from_content('<p>Paragraph text</p>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

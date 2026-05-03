"""Tests for the `h1` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "h1.xsd"


def test_h1_page_validation() -> None:
    """Validate a plain `h1` fragment."""

    element = Element.from_content("<h1>Heading one</h1>", schema=SCHEMA)
    element.validate()


def test_h1_allows_nested_content() -> None:
    """Validate that `h1` can contain nested child elements."""

    element = Element.from_content("<h1><span>Heading one</span></h1>", schema=SCHEMA)
    element.validate()


def test_h1_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `h1`."""

    element = Element.from_content('<h1 data-testid="hero-title">Heading one</h1>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

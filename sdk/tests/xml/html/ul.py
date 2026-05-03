"""Tests for the `ul` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "ul.xsd"


def test_ul_page_validation() -> None:
    """Validate a plain `ul` fragment."""

    element = Element.from_content("<ul><li>Item</li></ul>", schema=SCHEMA)
    element.validate()


def test_ul_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `ul`."""

    element = Element.from_content('<ul data-testid="list"><li>Item</li></ul>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

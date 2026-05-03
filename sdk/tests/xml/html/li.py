"""Tests for the `li` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "li.xsd"


def test_li_page_validation() -> None:
    """Validate a plain `li` fragment."""

    element = Element.from_content("<li>Item</li>", schema=SCHEMA)
    element.validate()


def test_li_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `li`."""

    element = Element.from_content('<li data-testid="item">Item</li>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

"""Tests for the `h2` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "h2.xsd"


def test_h2_page_validation() -> None:
    """Validate a plain `h2` fragment."""

    element = Element.from_content("<h2>Heading two</h2>", schema=SCHEMA)
    element.validate()


def test_h2_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `h2`."""

    element = Element.from_content('<h2 data-testid="title">Heading two</h2>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

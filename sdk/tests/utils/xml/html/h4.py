"""Tests for the `h4` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "h4.xsd"


def test_h4_page_validation() -> None:
    """Validate a plain `h4` fragment."""

    element = Element.from_content("<h4>Heading four</h4>", schema=SCHEMA)
    element.validate()


def test_h4_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `h4`."""

    element = Element.from_content('<h4 data-testid="title">Heading four</h4>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

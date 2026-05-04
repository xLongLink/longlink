"""Tests for the `h3` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "h3.xsd"


def test_h3_page_validation() -> None:
    """Validate a plain `h3` fragment."""

    element = Element.from_content("<h3>Heading three</h3>", schema=SCHEMA)
    element.validate()


def test_h3_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `h3`."""

    element = Element.from_content('<h3 data-testid="title">Heading three</h3>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

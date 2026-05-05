"""Tests for the `Page` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "primitives" / "Page.xsd"


def test_page_layout_validation() -> None:
    """Validate a minimal `Page` layout fragment."""

    element = Element.from_content('<Page name="dashboard"><State id="filters" /></Page>', schema=SCHEMA)
    element.validate()


def test_page_layout_requires_name() -> None:
    """Reject a `Page` fragment missing its required name."""

    element = Element.from_content("<Page><State id=\"filters\" /></Page>", schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

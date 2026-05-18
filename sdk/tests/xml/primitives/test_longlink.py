"""Tests for the `longlink` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "primitives" / "Longlink.xsd"


def test_longlink_layout_validation() -> None:
    """Validate a minimal `longlink` layout fragment."""

    element = Element.from_content('<longlink><P>Dashboard</P></longlink>', schema=SCHEMA)
    element.validate()


def test_longlink_layout_allows_nested_children() -> None:
    """Allow nested XML children inside `longlink`."""

    element = Element.from_content('<longlink><State id="filters" value="[]" /><Query id="projects" path="/projects" /></longlink>', schema=SCHEMA)
    element.validate()


def test_longlink_layout_rejects_root_attributes() -> None:
    """Reject attributes that are not allowed on `longlink`."""

    element = Element.from_content('<longlink name="dashboard"><P>Dashboard</P></longlink>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

    element = Element.from_content('<longlink icon="layout-grid"><P>Dashboard</P></longlink>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

"""Tests for the `ToggleGroup` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "ToggleGroup.xsd"


def test_toggle_group_validation() -> None:
    """Validate a minimal `ToggleGroup` fragment."""

    element = Element.from_content(
        '<ToggleGroup type="single" orientation="horizontal" size="sm"><ToggleGroupItem value="a">A</ToggleGroupItem></ToggleGroup>',
        schema=SCHEMA,
    )
    element.validate()


def test_toggle_group_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `ToggleGroup`."""

    element = Element.from_content('<ToggleGroup tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

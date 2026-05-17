"""Tests for the `State` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "primitives" / "State.xsd"


def test_state_layout_validation() -> None:
    """Validate a minimal `State` layout fragment."""

    element = Element.from_content('<State id="filters" value="[]"><query /></State>', schema=SCHEMA)
    element.validate()


def test_state_layout_accepts_nested_content() -> None:
    """Allow nested XML content inside `State`."""

    element = Element.from_content('<State id="filters" value="[]"><p>Filters</p></State>', schema=SCHEMA)
    element.validate()


def test_state_layout_requires_id() -> None:
    """Reject a `State` fragment missing its required id."""

    element = Element.from_content('<State value="[]" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_state_layout_requires_value() -> None:
    """Reject a `State` fragment missing its required value."""

    element = Element.from_content('<State id="filters" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

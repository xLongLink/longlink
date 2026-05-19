"""Tests for the `State` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "State.xsd"


def test_state_layout_validation() -> None:
    """Validate a minimal `State` layout fragment."""

    element = Element.from_content('<State id="filters" value="[]" />', schema=SCHEMA)
    element.validate()


def test_state_layout_allows_multiple_initial_fields() -> None:
    """Allow multi-field state definitions."""

    element = Element.from_content('<State id="filters" value1="first value" score="10" list="[]" />', schema=SCHEMA)
    element.validate()


def test_state_layout_rejects_nested_content() -> None:
    """Reject nested XML content inside `State`."""

    element = Element.from_content('<State id="filters" value="[]"><P>Filters</P></State>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_state_layout_requires_id() -> None:
    """Reject a `State` fragment missing its required id."""

    element = Element.from_content('<State value="[]" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_state_layout_allows_empty_state() -> None:
    """Allow an empty `State` fragment so the runtime can seed an empty proxy."""

    element = Element.from_content('<State id="filters" />', schema=SCHEMA)
    element.validate()

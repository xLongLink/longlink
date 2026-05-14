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


def test_state_layout_requires_id() -> None:
    """Reject a `State` fragment missing its required id."""

    element = Element.from_content('<State value="[]" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

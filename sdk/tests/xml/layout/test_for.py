"""Tests for the `For` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "layout" / "For.xsd"


def test_for_layout_validation() -> None:
    """Validate a minimal `For` layout fragment."""

    element = Element.from_content('<For each="items" as="item"><item /></For>', schema=SCHEMA)
    element.validate()


def test_for_layout_requires_as() -> None:
    """Reject a `For` fragment missing its required alias."""

    element = Element.from_content('<For each="items" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

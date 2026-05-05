"""Tests for the `Query` XML layout schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "primitives" / "Query.xsd"


def test_query_layout_validation() -> None:
    """Validate a minimal `Query` layout fragment."""

    element = Element.from_content('<Query id="projects" path="/projects"><item /></Query>', schema=SCHEMA)
    element.validate()


def test_query_layout_requires_path() -> None:
    """Reject a `Query` fragment missing its required path."""

    element = Element.from_content('<Query id="projects" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

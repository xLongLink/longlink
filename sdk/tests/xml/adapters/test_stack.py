"""Tests for the `Stack` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Stack.xsd"


def test_stack_validation() -> None:
    """Validate a compound `Stack` fragment."""

    element = Element.from_content('<Stack><p>First</p><p>Second</p></Stack>', schema=SCHEMA)
    element.validate()


def test_stack_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Stack`."""

    element = Element.from_content('<Stack tone="accent">First</Stack>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

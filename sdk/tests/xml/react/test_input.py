"""Tests for the `Input` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Input.xsd"


def test_input_validation() -> None:
    """Validate a minimal `Input` fragment."""

    element = Element.from_content('<Input placeholder="Draft title" value="Draft" type="text" if="isEditable" />', schema=SCHEMA)
    element.validate()


def test_input_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Input`."""

    element = Element.from_content('<Input placeholder="Draft title" value="Draft" autocomplete="off" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

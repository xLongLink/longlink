"""Tests for the `Checkbox` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Checkbox.xsd"


def test_checkbox_validation() -> None:
    """Validate a minimal `Checkbox` fragment."""

    element = Element.from_content('<Checkbox checked="true" defaultChecked="false" disabled="true" if="canEdit" />', schema=SCHEMA)
    element.validate()


def test_checkbox_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Checkbox`."""

    element = Element.from_content('<Checkbox tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

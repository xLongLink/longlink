"""Tests for the `Switch` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Switch.xsd"


def test_switch_validation() -> None:
    """Validate a minimal `Switch` fragment."""

    element = Element.from_content('<Switch checked="true" defaultChecked="false" disabled="true" size="sm" if="canEdit" />', schema=SCHEMA)
    element.validate()


def test_switch_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Switch`."""

    element = Element.from_content('<Switch tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

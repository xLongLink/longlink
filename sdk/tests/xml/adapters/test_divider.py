"""Tests for the `Divider` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Divider.xsd"


def test_divider_validation() -> None:
    """Validate a minimal `Divider` fragment."""

    element = Element.from_content("<Divider />", schema=SCHEMA)
    element.validate()


def test_divider_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `Divider`."""

    element = Element.from_content('<Divider if="show" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

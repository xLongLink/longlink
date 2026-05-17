"""Tests for the `Icon` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Icon.xsd"


def test_icon_validation() -> None:
    """Validate a minimal `Icon` fragment."""

    element = Element.from_content('<Icon name="layout-grid" className="size-4" if="show" />', schema=SCHEMA)
    element.validate()


def test_icon_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Icon`."""

    element = Element.from_content('<Icon name="layout-grid" tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

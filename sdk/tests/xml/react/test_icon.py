"""Tests for the `Icon` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Icon.xsd"


def test_icon_validation() -> None:
    """Validate a minimal `Icon` fragment."""

    element = Element.from_content('<Icon />', schema=SCHEMA)
    element.validate()


def test_icon_allows_if_attribute() -> None:
    """Allow the schema-supported `if` attribute on `Icon`."""

    element = Element.from_content('<Icon if="show" />', schema=SCHEMA)
    element.validate()


def test_icon_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Icon`."""

    element = Element.from_content('<Icon name="home" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

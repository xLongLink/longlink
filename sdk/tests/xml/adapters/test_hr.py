"""Tests for the `Hr` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Hr.xsd"


def test_hr_validation() -> None:
    """Validate a minimal `Hr` fragment."""

    element = Element.from_content("<Hr />", schema=SCHEMA)

    element.validate()


def test_hr_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Hr`."""

    element = Element.from_content('<Hr if="show" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

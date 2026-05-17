"""Tests for the `Badge` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Badge.xsd"


def test_badge_validation() -> None:
    """Validate a minimal `Badge` fragment."""

    element = Element.from_content('<Badge variant="secondary">New</Badge>', schema=SCHEMA)
    element.validate()


def test_badge_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Badge`."""

    element = Element.from_content('<Badge tone="accent">New</Badge>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

"""Tests for the `Label` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Label.xsd"


def test_label_validation() -> None:
    """Validate a minimal `Label` fragment."""

    element = Element.from_content('<Label htmlFor="newsletter" if="canEdit">Newsletter</Label>', schema=SCHEMA)
    element.validate()


def test_label_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Label`."""

    element = Element.from_content('<Label tone="accent">Newsletter</Label>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

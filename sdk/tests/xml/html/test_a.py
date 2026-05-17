"""Tests for the `a` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "a.xsd"


def test_a_validation() -> None:
    """Validate a plain anchor fragment."""

    element = Element.from_content('<a href="/icons">Open icons</a>', schema=SCHEMA)
    element.validate()


def test_a_rejects_missing_href() -> None:
    """Reject anchors without an href attribute."""

    element = Element.from_content('<a>Open icons</a>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

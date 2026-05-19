"""Tests for the `A` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "a.xsd"


def test_a_validation() -> None:
    """Validate a plain anchor fragment."""

    element = Element.from_content('<A href="/icons">Open icons</A>', schema=SCHEMA)
    element.validate()


def test_a_rejects_missing_href() -> None:
    """Reject anchors without an href attribute."""

    element = Element.from_content('<A>Open icons</A>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

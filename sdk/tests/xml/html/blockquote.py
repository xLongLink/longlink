"""Tests for the `blockquote` HTML fragment schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "html" / "blockquote.xsd"


def test_blockquote_page_validation() -> None:
    """Validate a plain `blockquote` fragment."""

    element = Element.from_content("<blockquote>Quote text</blockquote>", schema=SCHEMA)
    element.validate()


def test_blockquote_rejects_attributes() -> None:
    """Reject attributes that are not allowed on `blockquote`."""

    element = Element.from_content(
        '<blockquote data-testid="quote">Quote text</blockquote>',
        schema=SCHEMA,
    )

    with pytest.raises(ValueError):
        element.validate()

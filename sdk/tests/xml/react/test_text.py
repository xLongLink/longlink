"""Tests for the `Text` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Text.xsd"


def test_text_requires_value() -> None:
    """Reject a `Text` fragment missing its required value."""

    element = Element.from_content("<Text />", schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

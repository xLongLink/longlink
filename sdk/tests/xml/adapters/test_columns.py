"""Tests for the `Columns` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Columns.xsd"


def test_columns_validation() -> None:
    """Validate a compound `Columns` fragment."""

    element = Element.from_content(
        '<Columns><Column width="70">Main content</Column><Column width="30">Sidebar</Column></Columns>',
        schema=SCHEMA,
    )
    element.validate()


def test_column_requires_width() -> None:
    """Reject columns that omit the `width` attribute."""

    element = Element.from_content('<Columns><Column>Main content</Column></Columns>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

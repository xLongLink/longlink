"""Tests for the `Table` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Table.xsd"


def test_table_validation() -> None:
    """Validate a compound `Table` fragment."""

    element = Element.from_content(
        '<Table><TableCaption>Revenue by quarter</TableCaption><TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead>Revenue</TableHead><TableHead>Growth</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Q1</TableCell><TableCell>$120k</TableCell><TableCell>12%</TableCell><TableCell>On track</TableCell></TableRow><TableRow><TableCell>Q2</TableCell><TableCell>$154k</TableCell><TableCell>28%</TableCell><TableCell>On track</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>Total</TableCell><TableCell>$274k</TableCell><TableCell>20%</TableCell><TableCell>Projected</TableCell></TableRow></TableFooter></Table>',
        schema=SCHEMA,
    )

    element.validate()


def test_table_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Table`."""

    element = Element.from_content('<Table tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

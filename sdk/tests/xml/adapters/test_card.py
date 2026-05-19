"""Tests for the `Card` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Card.xsd"


def test_card_validation() -> None:
    """Validate a compound `Card` fragment."""

    element = Element.from_content(
        '<Card><CardHeader><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription><CardAction>Card Action</CardAction></CardHeader><CardContent><P>Card Content</P></CardContent><CardFooter><P>Card Footer</P></CardFooter></Card>',
        schema=SCHEMA,
    )
    element.validate()


def test_card_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Card`."""

    element = Element.from_content('<Card tone="accent">Revenue</Card>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

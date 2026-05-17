"""Tests for the `Tooltip` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Tooltip.xsd"


def test_tooltip_validation() -> None:
    """Validate a compound `Tooltip` fragment."""

    element = Element.from_content(
        '<TooltipProvider><Tooltip open="true"><TooltipTrigger>Hover me</TooltipTrigger><TooltipContent side="right">Tooltip text</TooltipContent></Tooltip></TooltipProvider>',
        schema=SCHEMA,
    )

    element.validate()


def test_tooltip_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Tooltip`."""

    element = Element.from_content('<Tooltip tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

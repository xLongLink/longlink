"""Tests for the `Select` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Select.xsd"


def test_select_validation() -> None:
    """Validate a compound `Select` fragment."""

    element = Element.from_content(
        '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Views</SelectLabel><SelectItem value="overview">Overview</SelectItem><SelectItem value="settings">Settings</SelectItem></SelectGroup><SelectSeparator /><SelectGroup><SelectLabel>Status</SelectLabel><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectGroup></SelectContent></Select>',
        schema=SCHEMA,
    )

    element.validate()


def test_select_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Select`."""

    element = Element.from_content('<Select tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_select_item_requires_value() -> None:
    """Reject select items without a `value` attribute."""

    element = Element.from_content('<Select><SelectItem>Overview</SelectItem></Select>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

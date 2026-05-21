"""Tests for the `Tabs` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Tabs.xsd"


def test_tabs_validation() -> None:
    """Validate a compound `Tabs` fragment."""

    element = Element.from_content(
        """
        <Tabs defaultValue="overview">
          <Tab value="overview" label="Overview">Overview panel</Tab>
          <Tab value="settings" label="Settings">Settings panel</Tab>
        </Tabs>
        """,
        schema=SCHEMA,
    )

    element.validate()


def test_tabs_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Tabs`."""

    element = Element.from_content('<Tabs tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_tabs_trigger_requires_value() -> None:
    """Reject tabs without a tab `value` attribute."""

    element = Element.from_content('<Tabs><Tab label="Overview">Overview</Tab></Tabs>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

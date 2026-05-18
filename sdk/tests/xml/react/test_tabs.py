"""Tests for the `Tabs` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Tabs.xsd"


def test_tabs_validation() -> None:
    """Validate a compound `Tabs` fragment."""

    element = Element.from_content(
        """
        <Tabs defaultValue="overview">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview panel</TabsContent>
          <TabsContent value="settings">Settings panel</TabsContent>
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
    """Reject tabs triggers without a `value` attribute."""

    element = Element.from_content('<Tabs><TabsTrigger>Overview</TabsTrigger></Tabs>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

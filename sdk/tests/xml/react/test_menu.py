"""Tests for the `Menu` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Menu.xsd"


def test_menu_validation() -> None:
    """Validate a compound `Menu` fragment."""

    element = Element.from_content(
        """
        <Menu defaultValue="overview">
          <MenuList>
            <MenuSection value="overview">Overview</MenuSection>
            <MenuSection value="settings">
              Settings
              <MenuSubSection value="profile">Profile</MenuSubSection>
              <MenuSubSection value="billing">Billing</MenuSubSection>
            </MenuSection>
          </MenuList>
          <MenuContent value="overview">Overview content</MenuContent>
          <MenuContent value="settings">Settings content</MenuContent>
          <MenuContent value="profile">Profile content</MenuContent>
          <MenuContent value="billing">Billing content</MenuContent>
        </Menu>
        """,
        schema=SCHEMA,
    )

    element.validate()


def test_menu_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Menu`."""

    element = Element.from_content('<Menu tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_menu_section_requires_value() -> None:
    """Reject menu sections without a `value` attribute."""

    element = Element.from_content('<Menu><MenuSection>First</MenuSection></Menu>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

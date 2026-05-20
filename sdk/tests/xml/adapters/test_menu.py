"""Tests for the `Menu` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Menu.xsd"


def test_menu_validation() -> None:
    """Validate a compound `Menu` fragment."""

    element = Element.from_content(
        """
        <Menu defaultValue="overview">
          <MenuSection value="overview" label="Overview">
            <P>Overview content</P>
          </MenuSection>
          <MenuSection value="settings" label="Settings">
            <P>Settings content</P>
            <MenuSubSection value="profile" label="Profile">
              <P>Profile content</P>
            </MenuSubSection>
            <MenuSubSection value="billing" label="Billing">
              <P>Billing content</P>
            </MenuSubSection>
          </MenuSection>
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

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Menu.xsd"


def test_menu_validation() -> None:
    """Validate a compound `Menu` fragment."""

    element = Element.from_content(
        """
        <Menu defaultValue="overview">
          <MenuSection value="overview" label="Overview" icon="layout-grid">
            <P i18n="Overview content" />
          </MenuSection>
          <MenuSection value="settings" label="Settings" icon="shield">
            <P i18n="Settings content" />
            <MenuSubSection value="profile" label="Profile">
              <P i18n="Profile content" />
            </MenuSubSection>
            <MenuSubSection value="billing" label="Billing">
              <P i18n="Billing content" />
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


def test_menu_section_accepts_icon() -> None:
    """Allow Lucide icon names on `MenuSection`."""

    element = Element.from_content(
        '<Menu><MenuSection value="overview" icon="layout-grid" i18n="Overview" /></Menu>',
        schema=SCHEMA,
    )

    element.validate()


def test_menu_section_requires_value() -> None:
    """Reject menu sections without a `value` attribute."""

    element = Element.from_content('<Menu><MenuSection i18n="First" /></Menu>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

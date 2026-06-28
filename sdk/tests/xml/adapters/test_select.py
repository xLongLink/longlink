import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Select.xsd"


def test_select_validation() -> None:
    """Validate a compound `Select` fragment."""

    element = Element.from_content(
        '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel i18n="Views" /><SelectItem value="overview" i18n="Overview" /><SelectItem value="settings" i18n="Settings" /></SelectGroup><SelectSeparator /><SelectGroup><SelectLabel i18n="Status" /><SelectItem value="active" i18n="Active" /><SelectItem value="archived" i18n="Archived" /></SelectGroup></SelectContent></Select>',
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

    element = Element.from_content('<Select><SelectItem i18n="Overview" /></Select>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

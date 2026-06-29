import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Action.xsd"


def test_action_validation() -> None:
    """Validate a minimal `Action` fragment."""

    content = (
        '<Action action="/profile" method="PATCH" json="${profile}" '
        'invalidate="${[&quot;profile&quot;]}"><Button i18n="Save" /></Action>'
    )
    element = Element.from_content(
        content,
        schema=SCHEMA,
    )
    element.validate()


def test_action_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Action`."""

    element = Element.from_content('<Action tone="accent"><Button i18n="Save" /></Action>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

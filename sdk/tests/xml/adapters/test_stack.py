import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Stack.xsd"


def test_stack_validation() -> None:
    """Validate a compound `Stack` fragment."""

    element = Element.from_content('<Stack><P i18n="First" /><P i18n="Second" /></Stack>', schema=SCHEMA)
    element.validate()


def test_stack_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Stack`."""

    element = Element.from_content('<Stack tone="accent"><P i18n="First" /></Stack>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

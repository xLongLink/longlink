import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Dialog.xsd"


def test_dialog_validation() -> None:
    """Validate a compound `Dialog` fragment."""

    element = Element.from_content(
        '<Dialog open="true"><DialogTrigger><Button i18n="Open dialog" /></DialogTrigger><DialogContent><DialogTitle><P i18n="Delete issue" /></DialogTitle><DialogDescription><P i18n="This cannot be undone." /></DialogDescription><Button i18n="Actions" /></DialogContent></Dialog>',
        schema=SCHEMA,
    )

    element.validate()


def test_dialog_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Dialog`."""

    element = Element.from_content('<Dialog tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Badge.xsd"


def test_badge_validation() -> None:
    """Validate a minimal `Badge` fragment."""

    element = Element.from_content('<Badge i18n="New" />', schema=SCHEMA)
    element.validate()


def test_badge_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Badge`."""

    element = Element.from_content('<Badge tone="accent" i18n="New" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "a.xsd"


def test_a_validation() -> None:
    """Validate a plain anchor fragment."""

    element = Element.from_content('<A href="/icons" i18n="Open icons" />', schema=SCHEMA)
    element.validate()


def test_a_allows_missing_href() -> None:
    """Allow anchors without an `href` attribute."""

    element = Element.from_content('<A i18n="Open icons" />', schema=SCHEMA)

    element.validate()

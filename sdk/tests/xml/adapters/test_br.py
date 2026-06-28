from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "br.xsd"


def test_br_validation() -> None:
    """Validate a plain break fragment."""

    element = Element.from_content("<Br />", schema=SCHEMA)
    element.validate()

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "li.xsd"


def test_li_validation_allows_translation_values() -> None:
    """Validate a list item with dynamic translation values."""

    element = Element.from_content(
        '<Li i18n="examples.cart.summary.item" name="${item.name}" quantity="${item.quantity}" price="${item.price}" />',
        schema=SCHEMA,
    )
    element.validate()

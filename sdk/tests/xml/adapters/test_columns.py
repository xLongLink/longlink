import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Columns.xsd"


def test_columns_validation() -> None:
    """Validate a compound `Columns` fragment."""

    element = Element.from_content(
        '<Columns><Column width="70"><P i18n="Main content" /></Column><Column width="30"><P i18n="Sidebar" /></Column></Columns>',
        schema=SCHEMA,
    )
    element.validate()


def test_column_requires_width() -> None:
    """Reject columns that omit the `width` attribute."""

    element = Element.from_content('<Columns><Column><P i18n="Main content" /></Column></Columns>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

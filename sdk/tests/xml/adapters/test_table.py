import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Table.xsd"


def test_table_validation() -> None:
    """Validate a compound `Table` fragment."""

    element = Element.from_content(
        '<Table><TableCaption><P i18n="Revenue by quarter" /></TableCaption><TableHeader><TableRow><TableHead i18n="Quarter" /><TableHead i18n="Revenue" /><TableHead i18n="Growth" /><TableHead i18n="Status" /></TableRow></TableHeader><TableBody><TableRow><TableCell i18n="Q1" /><TableCell i18n="$120k" /><TableCell i18n="12%" /><TableCell i18n="On track" /></TableRow><TableRow><TableCell i18n="Q2" /><TableCell i18n="$154k" /><TableCell i18n="28%" /><TableCell i18n="On track" /></TableRow></TableBody><TableFooter><TableRow><TableCell i18n="Total" /><TableCell i18n="$274k" /><TableCell i18n="20%" /><TableCell i18n="Projected" /></TableRow></TableFooter></Table>',
        schema=SCHEMA,
    )

    element.validate()


def test_table_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Table`."""

    element = Element.from_content('<Table tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_data_table_validation() -> None:
    """Validate a data-backed `DataTable` fragment."""

    element = Element.from_content(
        '<DataTable data="$items" as="item" empty="No items"><DataColumn field="sku" header="SKU" /><DataColumn><DataHeader><P i18n="Item" /><Badge i18n="SKU" /></DataHeader><DataCell><P value="$item.name" /><Badge value="$item.sku" /></DataCell></DataColumn></DataTable>',
        schema=SCHEMA,
    )

    element.validate()


def test_data_table_requires_data() -> None:
    """Reject `DataTable` fragments without a data source."""

    element = Element.from_content('<DataTable><DataColumn field="sku" header="SKU" /></DataTable>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()

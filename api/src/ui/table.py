from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Column:
    key: str
    label: str
    align: Literal['left', 'center', 'right'] = 'left'
    cell: str | list[str] = ''

    def __iter__(self):
        yield 'key', self.key
        yield 'label', self.label
        yield 'align', self.align
        yield 'cell', self.cell


@dataclass
class Table:
    data: list[dict] = field(default_factory=list)
    _columns: list[Column] = field(default_factory=list)

    def add_column(
        self,
        key: str,
        label: str,
        cell: str | list[str] = '',
        align: Literal['left', 'center', 'right'] = 'left',
    ) -> Column:
        column = Column(key=key, label=label, align=align, cell=cell)
        self._columns.append(column)

        return column

    def __iter__(self):
        yield 'type', 'table'
        yield 'props', {
            'columns': [dict(column) for column in self._columns],
            'data': self.data,
        }


if __name__ == '__main__':
    table = Table(data=[
            {
                'id': '1',
                'client': {
                    'name': 'Adriano Saurwein',
                    'email': 'adriano@email.com',
                },
                'invoiceNumber': 'INV-001',
                'issueDate': '2024-01-10',
                'dueDate': '2024-01-20',
                'status': 'Paid',
                'subtotal': 1000,
                'vat': 200,
            },
            {
                'id': '2',
                'client': {
                    'name': 'Leonardo Saurwein',
                    'email': 'leo@email.com',
                },
                'invoiceNumber': 'INV-002',
                'issueDate': '2024-01-15',
                'dueDate': '2024-01-30',
                'status': 'Pending',
                'subtotal': 450,
                'vat': 90,
            },
        ]
    )
    table.add_column('invoice', label='Invoice', cell=['{invoiceNumber}', 'Issued {issueDate}', 'Status: {status}'], align='left')
    table.add_column('client', label='Client', cell=['{client.name}', '{client.email}'])
    table.add_column('dueDate', label='Dates', cell=['{issueDate}', 'Due date: {dueDate}'], align='left')
    table.add_column('amount', label='Amount', cell=['€{subtotal}', 'VAT €{vat}'], align='right')

    print(dict(table))

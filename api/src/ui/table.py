from typing import Literal
from dataclasses import dataclass, field
from typing import Literal, TypeAlias


Alignments: TypeAlias = Literal['left', 'center', 'right']


@dataclass
class Column:
    key: str
    label: str
    align: Alignments = 'left'
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

    def column(self, key: str, label: str, cell: str | list[str] = '', align: Alignments = 'left' ) -> Column:
        column = Column(key=key, label=label, align=align, cell=cell)
        self._columns.append(column)

        return column

    def __iter__(self):
        yield 'type', 'table'
        yield 'props', {
            'columns': [dict(column) for column in self._columns],
            'data': self.data,
        }

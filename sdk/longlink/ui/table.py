from typing import Literal, TypeAlias
from dataclasses import dataclass, field
from .__root__ import Component


Alignments: TypeAlias = Literal['left', 'center', 'right']


@dataclass
class Column(Component):
    key: str
    label: str
    align: Alignments = 'left'
    cell: str | list[str] = ''

    def __iter__(self):
        yield 'type', 'column'
        yield 'props', {
            'key': self.key,
            'label': self.label,
            'align': self.align,
            'cell': self.cell,
        }
        yield 'children', []


@dataclass
class Table(Component):
    data: list[dict] = field(default_factory=list)
    _children: list[Column] = field(default_factory=list)

    def column(self, key: str, label: str, cell: str | list[str] = '', align: Alignments = 'left' ) -> Column:
        column = Column(key=key, label=label, align=align, cell=cell)
        self._children.append(column)

        return column

    def __iter__(self):
        yield 'type', 'table'
        yield 'props', {
            'data': self.data,
        }

        yield 'children', [dict(column) for column in self._children]

from typing import Literal, TypeAlias, overload
from dataclasses import dataclass, field
from .__root__ import Component


Alignments: TypeAlias = Literal['left', 'center', 'right']


# Import Components
from .link import Link 


class Column(Component):
    key: str
    label: str
    align: Alignments = 'left'
    value: str = ''   # First row in the cell
    detail: str = ''  # Second row in the cell

    def __init__(self, key: str, label: str, value: str | Link = '', detail: str | Link= '', align: Alignments = 'left',) -> None:
        self.key = key
        self.label = label
        self.align = align
        self.value = str(value)
        self.detail = str(detail)

    def __iter__(self):
        yield 'type', 'column'
        yield 'props', {
            'key': self.key,
            'label': self.label,
            'align': self.align,
            'value': self.value,
            'detail': self.detail,
        }
        yield 'children', []


@dataclass
class Table(Component):
    """LongLink Table component
    
    The table is a bit special, because it is designed to work with an endpoint
    that returns the table data as a list of dicts.
    The table therefore shall support automatic filtering based on the endpoint query parameters,
    """

    data: list[dict] = field(default_factory=list)
    _children: list[Column] = field(default_factory=list)

    @overload
    def column(self, key: Column) -> Column: ...

    @overload
    def column(self, 
        key: str, 
        label: str | None = None, 
        value: str | Link = '',
        detail: str | Link = '',
        align: Alignments = 'left'
    ) -> Column: ...

    def column(
        self,
        key: str | Column,
        label: str | None = None,
        value: str | Link = '',
        detail: str | Link = '',
        align: Alignments = 'left'
    ) -> Column:
        if isinstance(key, Column):
            column = key
        else:
            label = label or key.capitalize()
            column = Column(key=key, label=label,  value=value, detail=detail, align=align,)

        self._children.append(column)
        return column


    def __iter__(self):
        yield 'type', 'table'
        yield 'props', {
            'data': self.data,
        }

        yield 'children', [dict(column) for column in self._children]

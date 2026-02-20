from typing import Literal, TypeAlias, overload, TypedDict
from dataclasses import dataclass, field
from .__root__ import Component


Alignments: TypeAlias = Literal['left', 'center', 'right']


# Import Components
from .link import Link


class TableCell(TypedDict, total=False):
    value: str
    bold: bool
    link: str


"""
The Table component is tricky.

On the frontend, it uses Shadcn and @tanstack/react-table
https://tanstack.com/table/latest
However on the backend it shall behave on it's own, with the data linked to a endpoint that allows for paginations, sorting and filtering.
This has to be managed by the table itself without the need to reload the page.
"""


class Column(Component):
    key: str
    label: str
    align: Alignments = 'left'
    content: str | TableCell = ''
    detail: str | TableCell = ''

    def __init__(
        self,
        key: str,
        label: str,
        content: str | Link | TableCell = '',
        detail: str | Link | TableCell = '',
        align: Alignments = 'left',
    ) -> None:
        self.key = key
        self.label = label
        self.align = align
        self.content = self._normalize_cell(content)
        self.detail = self._normalize_cell(detail)

    def _normalize_cell(self, cell: str | Link | TableCell) -> str | TableCell:
        if isinstance(cell, dict):
            payload: TableCell = {'value': str(cell.get('value', ''))}
            if 'bold' in cell:
                payload['bold'] = bool(cell['bold'])
            if 'link' in cell:
                payload['link'] = str(cell['link'])
            return payload

        if isinstance(cell, Link):
            return {'value': cell.text, 'link': cell.url}

        return str(cell)

    def __iter__(self):
        props: dict[str, str | TableCell] = {
            'key': self.key,
            'label': self.label,
            'align': self.align,
            'content': self.content,
        }

        if self.detail:
            props['detail'] = self.detail

        yield 'type', 'column'
        yield 'props', props
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
    def column(
        self,
        key: str,
        label: str | None = None,
        content: str | Link | TableCell = '',
        detail: str | Link | TableCell = '',
        align: Alignments = 'left',
    ) -> Column: ...

    def column(
        self,
        key: str | Column,
        label: str | None = None,
        content: str | Link | TableCell = '',
        detail: str | Link | TableCell = '',
        align: Alignments = 'left',
    ) -> Column:
        if isinstance(key, Column):
            column = key
        else:
            label = label or key.capitalize()
            column = Column(
                key=key,
                label=label,
                content=content,
                detail=detail,
                align=align,
            )

        self._children.append(column)
        return column

    def __iter__(self):
        yield 'type', 'table'
        yield 'props', {
            'data': self.data,
        }

        yield 'children', [dict(column) for column in self._children]

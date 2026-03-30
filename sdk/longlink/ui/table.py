from typing import Literal, TypeAlias, TypedDict, overload
from .__root__ import Component
from dataclasses import field, dataclass

Alignments: TypeAlias = Literal['left', 'center', 'right']


class Cell(TypedDict, total=False):
    """
    Structured cell payload used for advanced rendering.

    Fields:
    - value: visible text content
    - bold: whether the text should be emphasized
    - link: optional URL rendered as anchor

    This structure keeps cell definitions fully serializable
    without relying on other component types.
    """
    value: str
    bold: bool
    link: str


class Column(Component):
    """
    Table column definition.

    A Column describes:
    - The key used to extract row values from `Table.data`
    - The display label
    - Alignment rules
    - Optional static content and detail overrides

    Serialization shape:
        {
            "type": "column",
            "props": {
                "key": <str>,
                "label": <str>,
                "align": <'left'|'center'|'right'>,
                "content": <str|Cell>,
                "detail": <str|Cell>?
            },
            "children": []
        }
    """

    key: str
    label: str
    align: Alignments = 'left'
    content: str | Cell = ''
    detail: str | Cell = ''

    def __init__(
        self,
        key: str,
        label: str,
        content: str | Cell = '',
        detail: str | Cell = '',
        align: Alignments = 'left',
    ) -> None:
        self.key = key
        self.label = label
        self.align = align
        self.content = self._normalize_cell(content)
        self.detail = self._normalize_cell(detail)

    def _normalize_cell(self, cell: str | Cell) -> str | Cell:
        """
        Normalize cell input into a consistent serializable structure.

        Accepts:
        - Plain string
        - TableCell dict

        Ensures:
        - `value` is always present if dict is provided
        - Optional fields are properly typed
        """
        if isinstance(cell, dict):
            payload: Cell = {'value': str(cell.get('value', ''))}
            if 'bold' in cell:
                payload['bold'] = bool(cell['bold'])
            if 'link' in cell:
                payload['link'] = str(cell['link'])
            return payload

        return str(cell)

    def __iter__(self):
        props: dict[str, str | Cell] = {
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
    """
    Data-driven tabular component.

    Responsibilities:
    - Receives row data as a list of dictionaries.
    - Defines column configuration via `Column` children.
    - Delegates rendering behavior (sorting, filtering, etc.)
      to the frontend runtime.

    Serialization shape:
        {
            "type": "table",
            "props": {
                "data": [ { ...row... }, ... ]
            },
            "children": [ ...column schemas... ]
        }
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
        content: str | Cell = '',
        detail: str | Cell = '',
        align: Alignments = 'left',
    ) -> Column: ...

    def column(
        self,
        key: str | Column,
        label: str | None = None,
        content: str | Cell = '',
        detail: str | Cell = '',
        align: Alignments = 'left',
    ) -> Column:
        """
        Register a column definition.

        Supports:
        - Passing an existing Column instance
        - Creating a new Column inline via parameters
        """
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
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .__layout__ import Layout


@dataclass
class Column:
    width: int
    layout: 'Layout'

    def __getattr__(self, item: str):
        return getattr(self.layout, item)

    def __iter__(self):
        yield 'type', 'column'
        yield 'props', {'width': self.width}
        yield 'children', list(self.layout)


class Columns:
    def __init__(self, widths: list[int], *, layout_factory: type['Layout']):
        self.columns = [Column(width=width, layout=layout_factory()) for width in widths]

    def __iter__(self):
        yield 'type', 'columns'
        yield 'children', [dict(column) for column in self.columns]


if __name__ == '__main__':
    from .__layout__ import Layout

    layout = Layout()
    col1, col2 = layout.columns([70, 30])

    col1.hero(title='Column 1', subtitle='This is the first column')
    col2.hero(title='Column 2', subtitle='This is the second column')

    print(list(layout))

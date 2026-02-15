from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .__layout__ import Layout


class Columns:
    def __init__(self, widths: list[int], *, layout_factory: type["Layout"]):
        self._widths = widths
        self.columns = [layout_factory() for _ in widths]
        
    def __iter__(self):
        yield "type", "columns"
        yield "widths", self._widths
        yield "columns", [list(column) for column in self.columns]


if __name__ == "__main__":
    from .__layout__ import Layout

    layout = Layout()
    col1, col2 = layout.columns([70, 30])

    col1.hero(title="Column 1", subtitle="This is the first column")
    col2.hero(title="Column 2", subtitle="This is the second column")

    print(list(layout))



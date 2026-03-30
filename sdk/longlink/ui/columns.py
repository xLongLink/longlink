from dataclasses import field, dataclass
from longlink.ui.hero import Hero
from longlink.ui.range import Range
from longlink.ui.table import Table
from longlink.ui.button import Button, ButtonVariants
from longlink.ui.__root__ import Component
from longlink.ui.separator import Separator


@dataclass
class Column(Component):
    """
    Vertical layout container used inside `Columns`.

    A Column behaves like a constrained Page section:
    - Components are stacked vertically in insertion order.
    - It owns and serializes its own subtree.
    - It cannot create global page-level constructs (e.g., menu),
      because those are restricted to the Page root.

    Serialization shape:
        {
            "type": "column",
            "props": {"width": <int>},
            "children": [ ...nested components... ]
        }

    The `width` is interpreted by the parent `Columns` container,
    which normalizes widths into layout ratios.
    """

    width: int
    _components: list[Component] = field(default_factory=list)

    def __iter__(self):
        yield 'type', 'column'
        yield 'props', {'width': self.width}
        yield 'children', [dict(component) for component in self._components]

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._components.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._components.append(table)
        return table

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        button = Button(text=text, variant=variant, url=url)
        self._components.append(button)
        return button

    def separator(self) -> Separator:
        separator = Separator()
        self._components.append(separator)
        return separator


    def range(
        self,
        label: str | None = None,
        description: str | None = None,
        min: float = 0,
        max: float = 100,
        step: float = 1,
        value: list[float] | None = None,
    ) -> Range:
        range_component = Range(
            label=label,
            description=description,
            min=min,
            max=max,
            step=step,
            value=value if value is not None else [min, max],
        )
        self._components.append(range_component)
        return range_component


@dataclass
class Columns(Component):
    """
    Horizontal layout container that distributes content across multiple columns.

    Responsibilities:
    - Owns multiple `Column` children.
    - Converts absolute column widths into normalized ratios.
    - Serializes the complete horizontal layout subtree.

    Usage pattern:
        columns = page.columns()
        left = columns.column(width=3)
        right = columns.column(width=1)

    Serialization shape:
        {
            "type": "columns",
            "props": {
                "widths": [normalized ratios]
            },
            "children": [ ...column subtrees... ]
        }

    Width normalization:
        Each column width is divided by the total width sum,
        producing proportional layout weights interpreted by the frontend.
    """

    _widths: list[int] = field(default_factory=list)
    _children: list[Column] = field(default_factory=list)

    def column(self, width: int) -> Column:
        column = Column(width=width)
        self._widths.append(width)
        self._children.append(column)
        return column

    def __iter__(self):
        tot = sum(self._widths)
        yield 'type', 'columns'
        yield 'props', {
            'widths': [col / tot for col in self._widths],
        }
        yield 'children', [dict(column) for column in self._children]

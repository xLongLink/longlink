from dataclasses import dataclass, field

from src.ui.__root__ import Component
from src.ui.button import Button, ButtonVariants
from src.ui.hero import Hero
from src.ui.separator import Separator
from src.ui.table import Table


@dataclass
class Column(Component):
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

    def button(self, text: str, variant: ButtonVariants = 'default') -> Button:
        button = Button(text=text, variant=variant)
        self._components.append(button)
        return button

    def separator(self) -> Separator:
        separator = Separator()
        self._components.append(separator)
        return separator


@dataclass
class Columns(Component):
    _columns: list[int] = field(default_factory=list)
    _children: list[Column] = field(default_factory=list)

    def column(self, width: int) -> Column:
        column = Column(width=width)
        self._columns.append(width)
        self._children.append(column)
        return column

    def __iter__(self):
        tot = sum(self._columns)
        yield 'type', 'columns'
        yield 'props', {
            'columns': [col / tot for col in self._columns],
        }
        yield 'children', [dict(column) for column in self._children]

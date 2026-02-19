from .__root__ import Component
from dataclasses import dataclass, field



from .hero import Hero
from .table import Table
from .button import Button, ButtonVariants
from .separator import Separator


@dataclass
class Column(Component):
    """LongLink Column component, used in the Columns component
    
    The column behave similarly to the Page, where each component is added vertically.
    However it cannot create a menu, as only one menu can exist per page.
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
    """LongLink Columns component, used to create a layout with multiple columns

    It can be used to have the main data on the left and some quick actions or insights on the right.
    An exmaple can be how GitHub show the repository insights: https://github.com/XLongLink/longlink
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

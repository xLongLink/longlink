from dataclasses import dataclass, field

from src.ui.__root__ import Component
from src.ui.tabs import Tab, Tabs
from src.ui.button import Button, ButtonVariants
from src.ui.columns import Column, Columns
from src.ui.hero import Hero
from src.ui.separator import Separator
from src.ui.table import Table


@dataclass
class MenuSubSection(Component):
    title: str
    root: bool = False
    _children: list[Component] = field(default_factory=list)

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._children.append(table)
        return table

    def button(self, text: str, variant: ButtonVariants = 'default') -> Button:
        button = Button(text=text, variant=variant)
        self._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        columns = Columns()
        self._children.append(columns)
        return [columns.column(width=width) for width in widths]

    def separator(self) -> Separator:
        separator = Separator()
        self._children.append(separator)
        return separator

    def tabs(self, names: list[str]) -> list[Tab]:
        tabs = Tabs()
        self._children.append(tabs)
        return [tabs.tab(name=name) for name in names]

    def __iter__(self):
        yield 'type', 'menuSubSection'
        yield 'props', {
            'title': self.title,
            'root': self.root,
        }
        yield 'children', [dict(child) for child in self._children]


@dataclass
class MenuSection(Component):
    title: str
    icon: str | None = None
    _root: MenuSubSection = field(default_factory=lambda: MenuSubSection(title='', root=True))
    _children: list[MenuSubSection] = field(default_factory=list)

    def section(self, title: str) -> MenuSubSection:
        sub_section = MenuSubSection(title=title)
        self._children.append(sub_section)
        return sub_section

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._root._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._root._children.append(table)
        return table

    def button(self, text: str, variant: ButtonVariants = 'default') -> Button:
        button = Button(text=text, variant=variant)
        self._root._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        columns = Columns()
        self._root._children.append(columns)
        return [columns.column(width=width) for width in widths]

    def separator(self) -> Separator:
        separator = Separator()
        self._root._children.append(separator)
        return separator

    def tabs(self, names: list[str]) -> list[Tab]:
        tabs = Tabs()
        self._root._children.append(tabs)
        return [tabs.tab(name=name) for name in names]

    def __iter__(self):
        yield 'type', 'menusection'
        yield 'props', {
            'title': self.title,
            'icon': self.icon,
        }
        yield 'children', [dict(self._root)] + [dict(child) for child in self._children]


@dataclass
class Menu(Component):
    _children: list[MenuSection] = field(default_factory=list)

    def section(self, title: str, icon: str | None = None) -> MenuSection:
        section = MenuSection(title=title, icon=icon)
        self._children.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._children]

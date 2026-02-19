from .__root__ import Component
from dataclasses import dataclass, field


# Importing components
from .tabs import Tab, Tabs
from .hero import Hero
from .input import Input
from .table import Table
from .separator import Separator
from .columns import Column, Columns
from .button import Button, ButtonVariants



@dataclass
class MenuSubSection(Component):
    """LongLink SubSection component, used in the MenuSection component
    
    When a Section has a Subsection, a dropdown icon is added to the sections that groups the subsections.
    Root: True indicate that the content of the section is directly in the section, without the need of a subsection.
    """

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

    def input(
        self,
        label: str | None = None,
        placeholder: str | None = None,
        description: str | None = None,
        submit: str | None = None,
    ) -> Input:
        input_component = Input(
            label=label,
            placeholder=placeholder,
            description=description,
            submit=submit,
        )
        self._children.append(input_component)
        return input_component

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
    """LongLink MenuSection component, used in the Menu component"""
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

    def input(
        self,
        label: str | None = None,
        placeholder: str | None = None,
        description: str | None = None,
        submit: str | None = None,
    ) -> Input:
        input_component = Input(
            label=label,
            placeholder=placeholder,
            description=description,
            submit=submit,
        )
        self._root._children.append(input_component)
        return input_component

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
    """LongLink Menu component
    
    This is inspired by the GitHub settings menu: https://github.com/XLongLink/longlink/settings
    """
    _children: list[MenuSection] = field(default_factory=list)

    def section(self, title: str, icon: str | None = None) -> MenuSection:
        section = MenuSection(title=title, icon=icon)
        self._children.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._children]

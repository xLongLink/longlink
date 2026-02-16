from dataclasses import dataclass, field
from src.ui.__root__ import Component

# Importing components that can be used in a Page
from src.ui.tabs import Tab, Tabs
from src.ui.menu import Menu
from src.ui.hero import Hero
from src.ui.table import Table
from src.ui.button import Button, ButtonVariants
from src.ui.columns import Column, Columns
from src.ui.separator import Separator


@dataclass
class Page:
    """Top-level component that represents a page in the UI
    
    A Page renders the components in the order they were added.
    """
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

    def menu(self) -> Menu:
        menu = Menu()
        self._children.append(menu)
        return menu

    def tabs(self, names: list[str]) -> list[Tab]:
        tabs = Tabs()
        self._children.append(tabs)
        return [tabs.tab(name=name) for name in names]

    def separator(self) -> Separator:
        separator = Separator()
        self._children.append(separator)
        return separator
    
    def __iter__(self):
        for component in self._children:
            yield dict(component)

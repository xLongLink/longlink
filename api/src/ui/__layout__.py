from typing import Literal

from .hero import Hero
from .separator import Separator
from .table import Table
from .button import Button
from .columns import Columns


class Layout:
    """
    Top-level component that represents a page in the UI.
    A /page/<name> endpoint will generare the page and a dict() is passed to the frontend.
    The frontend will interpret the dict and render the page accordingly. 
    """

    def __init__(self):
        self._components = []
    
    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._components.append(hero)
        return hero
    
    def table(self, data: list[dict] | None = None) -> Table:
        table = Table(data=data)
        self._components.append(table)
        return table

    def button(
        self,
        text: str,
        variant: Literal['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] = 'default',
    ) -> Button:
        button = Button(text=text, variant=variant)
        self._components.append(button)
        return button
    
    def columns(self, widths: list[int]) -> list["Layout"]:
        columns = Columns(widths, layout_factory=Layout)
        self._components.append(columns)
        return columns.columns

    def separator(self, orientation: str = 'horizontal') -> Separator:
        separator = Separator(orientation=orientation)
        self._components.append(separator)
        return separator
    
    def __iter__(self):
        for component in self._components:
            yield dict(component)

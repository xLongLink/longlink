from dataclasses import dataclass, field

from .__root__ import Component
from .button import Button, ButtonVariants
from .columns import Column, Columns
from .hero import Hero
from .input import Input
from .separator import Separator
from .table import Table


@dataclass
class Tab(Component):
    name: str
    _children: list[Component] = field(default_factory=list)

    def __iter__(self):
        yield 'type', 'tab'
        yield 'props', {
            'name': self.name,
        }
        yield 'children', [dict(child) for child in self._children]

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


@dataclass
class Tabs(Component):
    _tabs: list[str] = field(default_factory=list)
    _children: list[Tab] = field(default_factory=list)

    def tab(self, name: str) -> Tab:
        tab = Tab(name=name)
        self._tabs.append(name)
        self._children.append(tab)
        return tab

    def __iter__(self):
        yield 'type', 'tabs'
        yield 'props', {
            'tabs': self._tabs,
        }
        yield 'children', [dict(tab) for tab in self._children]

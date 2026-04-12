from .hero import Hero
from typing import Any
from .input import Input, InputKinds
from .range import Range
from .table import Table
from .button import Button, ButtonVariants
from .select import Select
from .columns import Column, Columns
from .__root__ import Component
from .separator import Separator
from dataclasses import field, dataclass


def _serialize_children(children: list[Component | str]) -> list[dict | str]:
    serialized_children: list[dict | str] = []

    for child in children:
        if isinstance(child, str):
            serialized_children.append(child)
        else:
            serialized_children.append(dict(child))

    return serialized_children


@dataclass
class TabsTrigger(Component):
    value: str
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str):
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'tabsTrigger'
        yield 'props', {
            'value': self.value,
        }
        yield 'children', _serialize_children(self._children)


@dataclass
class TabsList(Component):
    _children: list[TabsTrigger] = field(default_factory=list)

    def trigger(self, value: str, label: str | None = None) -> TabsTrigger:
        trigger = TabsTrigger(value=value)
        if label is not None:
            trigger.add(label)
        self._children.append(trigger)
        return trigger

    def __iter__(self):
        yield 'type', 'tabsList'
        yield 'props', {}
        yield 'children', [dict(child) for child in self._children]


@dataclass
class TabsContent(Component):
    value: str
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str):
        self._children.append(child)
        return self

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._children.append(table)
        return table

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        button = Button(text=text, variant=variant, url=url)
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
        name: str | None = None,
        kind: InputKinds = 'text',
        label: str | None = None,
        value: Any = None,
        placeholder: str | None = None,
        description: str | None = None,
        required: bool = False,
        disabled: bool = False,
        submit: str | None = None,
    ) -> Input:
        input_component = Input(
            name=name,
            kind=kind,
            label=label,
            value=value,
            placeholder=placeholder,
            description=description,
            required=required,
            disabled=disabled,
            submit=submit,
        )
        self._children.append(input_component)
        return input_component

    def select(
        self,
        options: list[dict[str, str]],
        name: str | None = None,
        label: str | None = None,
        value: str | None = None,
        placeholder: str | None = None,
        description: str | None = None,
        required: bool = False,
        disabled: bool = False,
        submit: str | None = None,
    ) -> Select:
        select_component = Select(
            options=options,
            name=name,
            label=label,
            value=value,
            placeholder=placeholder,
            description=description,
            required=required,
            disabled=disabled,
            submit=submit,
        )
        self._children.append(select_component)
        return select_component

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
        self._children.append(range_component)
        return range_component

    def __iter__(self):
        yield 'type', 'tabsContent'
        yield 'props', {
            'value': self.value,
        }
        yield 'children', _serialize_children(self._children)


@dataclass
class Tabs(Component):
    default_value: str | None = None
    _children: list[Component] = field(default_factory=list)

    def list(self) -> TabsList:
        tabs_list = TabsList()
        self._children.append(tabs_list)
        return tabs_list

    def content(self, value: str) -> TabsContent:
        content = TabsContent(value=value)
        self._children.append(content)
        return content

    def __iter__(self):
        props = {}
        if self.default_value is not None:
            props['defaultValue'] = self.default_value

        yield 'type', 'tabs'
        yield 'props', props
        yield 'children', [dict(child) for child in self._children]

from .__root__ import Component
from dataclasses import dataclass, field
from typing import Any

# Importing components
from .hero import Hero
from .input import Input, InputKinds
from .select import Select
from .table import Table
from .columns import Column, Columns
from .button import Button, ButtonVariants
from .separator import Separator
from .range import Range


@dataclass
class Tab(Component):
    """
    Container representing a single tab inside a `Tabs` component.

    Characteristics:
    - Owns an isolated vertical component subtree.
    - Children are rendered only when the tab is active (frontend responsibility).
    - Behaves similarly to a constrained Page/Column in terms of composition.

    Serialization shape:
        {
            "type": "tab",
            "props": {
                "name": <str>
            },
            "children": [ ...nested components... ]
        }

    The `name` is both:
    - The display label in the tab header.
    - The identifier used by the frontend to switch content.
    """

    name: str
    _children: list[Component] = field(default_factory=list)

    def __iter__(self):
        yield 'type', 'tab'
        yield 'props', {
            'name': self.name,
        }
        yield 'children', [dict(child) for child in self._children]

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        """Append a Hero component to this tab."""
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        """Append a Table component to this tab."""
        table = Table(data=data)
        self._children.append(table)
        return table

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        """Append a Button component to this tab."""
        button = Button(text=text, variant=variant, url=url)
        self._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        """
        Append a Columns layout to this tab.

        `widths` defines relative column weights.
        Returns the created Column instances for immediate population.
        """
        columns = Columns()
        self._children.append(columns)
        return [columns.column(width=width) for width in widths]

    def separator(self) -> Separator:
        """Insert a visual separator between components."""
        separator = Separator()
        self._children.append(separator)
        return separator

    def input(
        self,
        name: str | None = None,
        kind: InputKinds = "text",
        label: str | None = None,
        value: Any = None,
        placeholder: str | None = None,
        description: str | None = None,
        required: bool = False,
        disabled: bool = False,
        submit: str | None = None,
    ) -> Input:
        """
        Append an Input component to this tab.

        Intended for lightweight forms or tab-scoped actions.
        """
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
        """Append a standalone Select component to this tab."""
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
        """Append a Range component to this tab."""
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


@dataclass
class Tabs(Component):
    """
    Tabbed container that groups multiple `Tab` subtrees.

    Responsibilities:
    - Maintains ordered tab labels.
    - Owns corresponding `Tab` child components.
    - Serializes both tab metadata and tab content subtrees.

    Serialization shape:
        {
            "type": "tabs",
            "props": {
                "tabs": [<tab_name_1>, <tab_name_2>, ...]
            },
            "children": [ ...tab subtrees... ]
        }

    The frontend is responsible for:
    - Rendering the tab navigation header using `tabs`.
    - Switching visible content based on active tab.
    """

    _tabs: list[str] = field(default_factory=list)
    _children: list[Tab] = field(default_factory=list)

    def tab(self, name: str) -> Tab:
        """
        Create and register a new Tab.

        The order of creation defines visual order.
        """
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
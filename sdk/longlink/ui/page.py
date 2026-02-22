from longlink.ui.tabs import Tab, Tabs
from longlink.ui.hero import Hero
from longlink.ui.menu import Menu
from longlink.ui.table import Table
from typing import Any
from longlink.ui.input import Input, InputKinds
from longlink.ui.button import Button, ButtonVariants
from longlink.ui.columns import Column, Columns
from longlink.ui.__root__ import Component
from longlink.ui.separator import Separator
from longlink.ui.switch import Switch
from longlink.ui.checkbox import Checkbox


class Page:
    """
    Root container of the UI tree.

    The Page is the top-level composition boundary and entry point for
    server-driven rendering. It owns all first-level components and defines
    the complete UI structure returned to the frontend.

    Responsibilities:
    - Acts as the root of the component hierarchy.
    - Maintains ordered top-level children.
    - Enforces page-level constraints (e.g., single Menu instance).
    - Serializes the full component tree for transport.

    Unlike other components:
    - Page does not serialize itself as a node with "type".
    - It serializes directly to a list of component schemas.
    - It is the structural root, not a visual element.

    Serialization shape:
        [
            <component_schema>,
            <component_schema>,
            ...
        ]

    The frontend treats this list as the complete page definition.
    """

    def __init__(self):
        self._children: list[Component] = []

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        """Append a Hero header to the page."""
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        """Append a Table component to the page."""
        table = Table(data=data)
        self._children.append(table)
        return table

    def button(self, text: str, variant: ButtonVariants = 'default') -> Button:
        """Append a Button component to the page."""
        button = Button(text=text, variant=variant)
        self._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        """
        Append a horizontal Columns layout to the page.

        `widths` defines relative column weights.
        Returns the created Column instances for immediate population.
        """
        columns = Columns()
        self._children.append(columns)
        return [columns.column(width=width) for width in widths]

    def menu(self) -> Menu:
        """
        Append a Menu component to the page.

        Only one Menu should exist per page.
        Enforcement of that constraint is expected at a higher level.
        """
        menu = Menu()
        self._children.append(menu)
        return menu

    def tabs(self, names: list[str]) -> list[Tab]:
        """
        Append a Tabs container to the page.

        `names` defines the ordered tab labels.
        Returns the created Tab instances for immediate population.
        """
        tabs = Tabs()
        self._children.append(tabs)
        return [tabs.tab(name=name) for name in names]


    def input(
        self,
        name: str | None = None,
        kind: InputKinds = 'text',
        label: str | None = None,
        value: Any = None,
        placeholder: str | None = None,
        description: str | None = None,
        options: list[dict[str, str]] | None = None,
        required: bool = False,
        disabled: bool = False,
        submit: str | None = None,
    ) -> Input:
        """Append an Input component to the page."""
        input_component = Input(
            name=name,
            kind=kind,
            label=label,
            value=value,
            placeholder=placeholder,
            description=description,
            options=options,
            required=required,
            disabled=disabled,
            submit=submit,
        )
        self._children.append(input_component)
        return input_component


    def switch(
        self,
        label: str | None = None,
        description: str | None = None,
        active: bool = False,
    ) -> Switch:
        """Append a Switch component to the page."""
        switch_component = Switch(
            label=label,
            description=description,
            active=active,
        )
        self._children.append(switch_component)
        return switch_component


    def checkbox(
        self,
        label: str | None = None,
        description: str | None = None,
        checked: bool = False,
    ) -> Checkbox:
        """Append a Checkbox component to the page."""
        checkbox_component = Checkbox(
            label=label,
            description=description,
            checked=checked,
        )
        self._children.append(checkbox_component)
        return checkbox_component

    def separator(self) -> Separator:
        """Insert a visual separator between top-level components."""
        separator = Separator()
        self._children.append(separator)
        return separator

    def __iter__(self):
        """
        Serialize the full page by yielding each top-level component schema.

        The Page itself is not wrapped in a "type" node.
        It is the root of the UI document.
        """
        for component in self._children:
            yield dict(component)

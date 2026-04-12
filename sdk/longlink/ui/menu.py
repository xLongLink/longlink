from typing import Any
from dataclasses import field, dataclass
from longlink.ui.hero import Hero
# Importing components
from longlink.ui.tabs import Tabs
from longlink.ui.input import Input, InputKinds
from longlink.ui.table import Table
from longlink.ui.button import Button, ButtonVariants
from longlink.ui.select import Select
from longlink.ui.columns import Column, Columns
from longlink.ui.__root__ import Component
from longlink.ui.separator import Separator


@dataclass
class MenuSubSection(Component):
    """
    Lowest-level content container inside a MenuSection.

    A MenuSubSection groups related UI elements within a section.
    It behaves like a vertical layout container and owns its subtree.

    Behavior:
    - If `root=True`, the subsection represents the implicit root content
      of the section (i.e., no explicit subsection header in the UI).
    - If `root=False`, the frontend may render it as a collapsible
      or nested group under the parent section.

    Serialization shape:
        {
            "type": "menuSubSection",
            "props": {
                "title": <str>,
                "root": <bool>
            },
            "children": [ ...nested components... ]
        }
    """

    title: str
    root: bool = False
    _children: list[Component] = field(default_factory=list)

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        """Append a Hero component to this subsection."""
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        """Append a Table component to this subsection."""
        table = Table(data=data)
        self._children.append(table)
        return table

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        """Append a Button component to this subsection."""
        button = Button(text=text, variant=variant, url=url)
        self._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        """Append a Columns layout to this subsection."""
        columns = Columns()
        self._children.append(columns)
        return [columns.column(width=width) for width in widths]

    def separator(self) -> Separator:
        """Insert a visual separator."""
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
        """Append an Input component."""
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
        """Append a Select component."""
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

    def tabs(self, default_value: str | None = None) -> Tabs:
        """Append a Tabs container."""
        tabs = Tabs(default_value=default_value)
        self._children.append(tabs)
        return tabs

    def __iter__(self):
        yield 'type', 'menuSubSection'
        yield 'props', {
            'title': self.title,
            'root': self.root,
        }
        yield 'children', [dict(child) for child in self._children]


@dataclass
class MenuSection(Component):
    """
    Top-level grouping unit inside a Menu.

    A MenuSection:
    - Represents a major navigation category.
    - May contain direct content (via implicit root subsection).
    - May contain explicit subsections for further grouping.

    Structural model:
    - `_root` holds content attached directly to the section.
    - `_children` holds explicit MenuSubSection instances.

    Serialization shape:
        {
            "type": "menusection",
            "props": {
                "title": <str>,
                "icon": <str | null>
            },
            "children": [
                <root_subsection_schema>,
                <subsection_schema>,
                ...
            ]
        }
    """

    title: str
    icon: str | None = None
    _root: MenuSubSection = field(
        default_factory=lambda: MenuSubSection(title='', root=True)
    )
    _children: list[MenuSubSection] = field(default_factory=list)

    def section(self, title: str) -> MenuSubSection:
        """Create and append an explicit subsection."""
        sub_section = MenuSubSection(title=title)
        self._children.append(sub_section)
        return sub_section

    # Root-level content helpers

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._root._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._root._children.append(table)
        return table

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        button = Button(text=text, variant=variant, url=url)
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
        self._root._children.append(input_component)
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
        self._root._children.append(select_component)
        return select_component

    def tabs(self, default_value: str | None = None) -> Tabs:
        tabs = Tabs(default_value=default_value)
        self._root._children.append(tabs)
        return tabs

    def __iter__(self):
        yield 'type', 'menusection'
        yield 'props', {
            'title': self.title,
            'icon': self.icon,
        }
        yield 'children', [dict(self._root)] + [
            dict(child) for child in self._children
        ]


@dataclass
class Menu(Component):
    """
    Navigation-oriented container composed of multiple MenuSections.

    Intended for configuration or settings-style interfaces where
    content is grouped hierarchically.

    Serialization shape:
        {
            "type": "menu",
            "children": [ ...section schemas... ]
        }

    The frontend is responsible for:
    - Rendering section navigation (e.g., sidebar or grouped list).
    - Managing active section/subsection visibility.
    """

    _children: list[MenuSection] = field(default_factory=list)

    def section(self, title: str, icon: str | None = None) -> MenuSection:
        """Create and append a new MenuSection."""
        section = MenuSection(title=title, icon=icon)
        self._children.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._children]

from dataclasses import dataclass, field
from .__root__ import Component

# Import commonly nested components
from .hero import Hero
from .table import Table
from .input import Input
from .button import Button, ButtonVariants
from .columns import Column, Columns
from .separator import Separator
from .tabs import Tab, Tabs
from .range import Range


@dataclass
class Card(Component):
    """
    Visual content container used to group related elements.

    Characteristics:
    - Vertically stacks child components.
    - Optional title and subtitle for header rendering.
    - Optional bordered / elevated styling handled by frontend.
    - No layout logic beyond vertical stacking.

    Intended use cases:
    - Dashboard widgets
    - Grouped settings blocks
    - Information panels
    - Statistics containers

    Serialization shape:
        {
            "type": "card",
            "props": {
                "title": <str | null>,
                "subtitle": <str | null>
            },
            "children": [ ...nested components... ]
        }
    """

    title: str | None = None
    subtitle: str | None = None

    _children: list[Component] = field(default_factory=list)

    # ---- Child composition helpers ----

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._children.append(hero)
        return hero

    def table(self, data: list[dict]) -> Table:
        table = Table(data=data)
        self._children.append(table)
        return table

    def input(
        self,
        input_component: Input,
    ) -> Input:
        self._children.append(input_component)
        return input_component

    def button(
        self,
        text: str,
        variant: ButtonVariants = "default",
        url: str | None = None,
    ) -> Button:
        button = Button(text=text, variant=variant, url=url)
        self._children.append(button)
        return button

    def columns(self, widths: list[int]) -> list[Column]:
        columns = Columns()
        self._children.append(columns)
        return [columns.column(width=w) for w in widths]

    def separator(self) -> Separator:
        separator = Separator()
        self._children.append(separator)
        return separator

    def tabs(self, names: list[str]) -> list[Tab]:
        tabs = Tabs()
        self._children.append(tabs)
        return [tabs.tab(name=n) for n in names]


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

    def add(self, component: Component) -> Component:
        """
        Append any generic component.
        """
        self._children.append(component)
        return component

    # ---- Serialization ----

    def __iter__(self):
        yield "type", "card"
        yield "props", {
            "title": self.title,
            "subtitle": self.subtitle,
        }
        yield "children", [dict(child) for child in self._children]
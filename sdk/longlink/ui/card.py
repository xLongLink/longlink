from .__root__ import Component
from dataclasses import field, dataclass


def _serialize_children(children: list[Component | str]) -> list[dict | str]:
    return [dict(child) if isinstance(child, Component) else child for child in children]


@dataclass
class CardTitle(Component):
    text: str

    def __iter__(self):
        yield "type", "cardTitle"
        yield "props", {}
        yield "children", [self.text]


@dataclass
class CardDescription(Component):
    text: str

    def __iter__(self):
        yield "type", "cardDescription"
        yield "props", {}
        yield "children", [self.text]


@dataclass
class CardAction(Component):
    _children: list[Component] = field(default_factory=list)

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "cardAction"
        yield "props", {}
        yield "children", [dict(child) for child in self._children]


@dataclass
class CardHeader(Component):
    _children: list[Component] = field(default_factory=list)

    def title(self, text: str) -> CardTitle:
        title = CardTitle(text=text)
        self._children.append(title)
        return title

    def description(self, text: str) -> CardDescription:
        description = CardDescription(text=text)
        self._children.append(description)
        return description

    def action(self) -> CardAction:
        action = CardAction()
        self._children.append(action)
        return action

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "cardHeader"
        yield "props", {}
        yield "children", [dict(child) for child in self._children]


@dataclass
class CardContent(Component):
    _children: list[Component] = field(default_factory=list)

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "cardContent"
        yield "props", {}
        yield "children", [dict(child) for child in self._children]


@dataclass
class CardFooter(Component):
    _children: list[Component] = field(default_factory=list)

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "cardFooter"
        yield "props", {}
        yield "children", [dict(child) for child in self._children]


@dataclass
class Card(Component):
    _children: list[Component | str] = field(default_factory=list)

    def header(self) -> CardHeader:
        header = CardHeader()
        self._children.append(header)
        return header

    def content(self) -> CardContent:
        content = CardContent()
        self._children.append(content)
        return content

    def footer(self) -> CardFooter:
        footer = CardFooter()
        self._children.append(footer)
        return footer

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def text(self, value: str) -> str:
        self._children.append(value)
        return value

    def __iter__(self):
        yield "type", "card"
        yield "props", {}
        yield "children", _serialize_children(self._children)

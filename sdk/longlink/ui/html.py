from .__root__ import Component
from dataclasses import field, dataclass


def _serialize_children(children: list[Component | str]) -> list[dict | str]:
    serialized: list[dict | str] = []

    for child in children:
        if isinstance(child, str):
            serialized.append(child)
        else:
            serialized.append(dict(child))

    return serialized


@dataclass
class H1(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'H1':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'h1'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class H2(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'H2':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'h2'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class H3(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'H3':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'h3'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class H4(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'H4':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'h4'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class P(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'P':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'p'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class Blockquote(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'Blockquote':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'blockquote'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class Code(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'Code':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'code'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class Li(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'Li':
        self._children.append(child)
        return self

    def __iter__(self):
        yield 'type', 'li'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)


@dataclass
class Ul(Component):
    _children: list[Component | str] = field(default_factory=list)

    def add(self, child: Component | str) -> 'Ul':
        self._children.append(child)
        return self

    def li(self, value: str | Component) -> Li:
        item = Li()
        item.add(value)
        self._children.append(item)
        return item

    def __iter__(self):
        yield 'type', 'ul'
        yield 'props', {}
        yield 'children', _serialize_children(self._children)

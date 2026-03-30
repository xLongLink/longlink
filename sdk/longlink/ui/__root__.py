from abc import ABC


class Component(ABC):
    __name__: str
    _children: list

    def __iter__(self):
        yield "type", self.__name__
        yield "props", {}
        yield "children", [dict(child) for child in self._children]
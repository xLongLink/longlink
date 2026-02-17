from dataclasses import dataclass
from .__root__ import Component


@dataclass
class Separator(Component):
    def __iter__(self):
        yield 'type', 'separator'
        yield 'props', {}
        yield 'children', []
        

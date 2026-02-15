from dataclasses import dataclass


@dataclass
class Separator:
    def __iter__(self):
        yield 'type', 'separator'
        yield 'props', {}

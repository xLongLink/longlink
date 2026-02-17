from dataclasses import dataclass


@dataclass
class Form:
    def __iter__(self):
        yield 'type', 'form'

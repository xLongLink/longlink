from dataclasses import dataclass
from src.ui.__root__ import Component


@dataclass
class Hero(Component):
    """Hero component"""

    title: str
    subtitle: str | None = None

    def __iter__(self):
        yield 'type', 'hero'
        yield 'props', {
            'title': self.title,
            'subtitle': self.subtitle,
        }


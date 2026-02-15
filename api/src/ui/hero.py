from dataclasses import dataclass


@dataclass
class Hero:
    """Hero component"""

    title: str
    subtitle: str | None = None

    def __iter__(self):
        yield 'type', 'hero'
        yield 'props', {
            'title': self.title,
            'subtitle': self.subtitle,
        }


if __name__ == "__main__":
    hero = Hero(title="Data Table", subtitle="This is a subtitle")
    print(dict(hero))

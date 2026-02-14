class Hero:
    """Hero component"""
    title: str
    subtitle: str | None

    def __init__(self, title: str, subtitle: str | None = None):
        self.title = title
        self.subtitle = subtitle

    def __iter__(self):
        yield "type", "hero"
        yield "title", self.title
        yield "subtitle", self.subtitle


if __name__ == "__main__":
    hero = Hero(title="Data Table", subtitle="This is a subtitle")
    print(dict(hero))

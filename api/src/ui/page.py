from .hero import Hero


class Page:
    """
    Top-level component that represents a page in the UI.
    A /page/<name> endpoint will generare the page and a dict() is passed to the frontend.
    The frontend will interpret the dict and render the page accordingly. 
    """

    def __init__(self):
        self._components = []
    
    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._components.append(hero)
        return hero

    def __iter__(self):
        for component in self._components:
            yield dict(component)
            

if __name__ == "__main__":
    page = Page()
    hero = page.hero(title="Data Table")

    # menu1, menu2 = page.sidebar(["Example", "Code"])
    # menu1.text("Menu item 1")
    # menu1.text("Menu item 2")

    # btn = page.button("Click me")
    # btn.action(lambda: print("Button clicked!"))
    # btn.modal("This is a modal dialog.")

    # tab1, tab2 = menu1.tabs(["Example", "Code"])
    # tab1.text("Example content here.")
    # tab2.text("Code content here.")

    print(list(page))

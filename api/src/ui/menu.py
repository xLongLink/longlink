class MenuSubSection:
    title: str
    href: str

    def __init__(self, title: str, href: str):
        self.title = title
        self.href = href

    def __iter__(self):
        yield 'type', 'menuSubSection'
        yield 'props', {
            'title': self.title,
            'href': self.href,
        }


class MenuSection:
    title: str
    href: str | None
    icon: str | None

    def __init__(self, title: str, href: str | None = None, icon: str | None = None):
        self.title = title
        self.href = href
        self.icon = icon
        self._sub_sections: list[MenuSubSection] = []

    def sub_section(self, title: str, href: str) -> MenuSubSection:
        sub_section = MenuSubSection(title=title, href=href)
        self._sub_sections.append(sub_section)
        return sub_section

    def __iter__(self):
        yield 'type', 'menuSection'
        yield 'props', {
            'title': self.title,
            'href': self.href,
            'icon': self.icon,
        }
        yield 'children', [dict(sub_section) for sub_section in self._sub_sections]


class Menu:
    def __init__(self):
        self._sections: list[MenuSection] = []

    def section(self, title: str, href: str | None = None, icon: str | None = None) -> MenuSection:
        section = MenuSection(title=title, href=href, icon=icon)
        self._sections.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._sections]

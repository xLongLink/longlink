from collections.abc import Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .__layout__ import Layout


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
    icon: str | None

    def __init__(
        self,
        title: str,
        icon: str | None = None,
        layout_factory: Callable[[], 'Layout'] | None = None,
    ):
        self.title = title
        self.icon = icon
        self._layout = layout_factory() if layout_factory else None
        self._sub_sections: list[MenuSubSection] = []

    @property
    def layout(self) -> 'Layout | None':
        return self._layout

    def sub_section(self, title: str, href: str) -> MenuSubSection:
        sub_section = MenuSubSection(title=title, href=href)
        self._sub_sections.append(sub_section)
        return sub_section

    def __iter__(self):
        yield 'type', 'menuSection'
        yield 'props', {
            'title': self.title,
            'icon': self.icon,
        }
        yield 'sections', [dict(sub_section) for sub_section in self._sub_sections]
        yield 'children', list(self._layout) if self._layout else []


class Menu:
    def __init__(self, layout_factory: Callable[[], 'Layout'] | None = None):
        self._layout_factory = layout_factory
        self._sections: list[MenuSection] = []

    def section(self, title: str, icon: str | None = None) -> MenuSection:
        section = MenuSection(title=title, icon=icon, layout_factory=self._layout_factory)
        self._sections.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._sections]

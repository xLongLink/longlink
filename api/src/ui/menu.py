from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .__layout__ import Layout


@dataclass
class MenuSubSection:
    title: str
    href: str

    def __iter__(self):
        yield 'type', 'menuSubSection'
        yield 'props', {
            'title': self.title,
            'href': self.href,
        }


@dataclass
class MenuSection:
    title: str
    icon: str | None = None
    _layout: 'Layout | None' = None
    _sub_sections: list[MenuSubSection] = field(default_factory=list)

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
        section = MenuSection(
            title=title,
            icon=icon,
            _layout=self._layout_factory() if self._layout_factory else None,
        )
        self._sections.append(section)
        return section

    def __iter__(self):
        yield 'type', 'menu'
        yield 'children', [dict(section) for section in self._sections]

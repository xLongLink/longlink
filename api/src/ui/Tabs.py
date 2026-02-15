from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .__layout__ import Layout


@dataclass
class Tab:
    title: str
    _layout: 'Layout'

    def __iter__(self):
        yield 'type', 'tab'
        yield 'props', {
            'title': self.title,
        }
        yield 'children', list(self._layout)


class Tabs:
    def __init__(self, layout_factory: Callable[[], 'Layout'], default_tab: str | None = None):
        self._layout_factory = layout_factory
        self._default_tab = default_tab
        self._tabs: list[Tab] = []

    def tab(self, title: str) -> Tab:
        tab = Tab(title=title, _layout=self._layout_factory())
        self._tabs.append(tab)
        return tab

    def __iter__(self):
        yield 'type', 'tabs'
        yield 'props', {
            'defaultTab': self._default_tab,
        }
        yield 'children', [dict(tab) for tab in self._tabs]

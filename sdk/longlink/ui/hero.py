from .__root__ import Component
from dataclasses import dataclass, field


# Import Components
from .button import Button, ButtonVariants


@dataclass
class Hero(Component):
    """LongLink Hero component, used to display a title and a subtitle, usually at the top of the page.
    
    It supports an icon that is displayed on the left of the title, and can be used to give a quick insight of the page content.
    It supports an action button that can be used to trigger an action related to the page content, like creating a new resource, or opening a dialog with more details.
    """
    title: str
    subtitle: str | None = None
    icon: str | None = None
    action: Button | None = field(default=None)

    def button(self, text: str, variant: ButtonVariants = 'default') -> Button:
        button = Button(text=text, variant=variant)
        self.action = button
        return button

    def __iter__(self):
        yield 'type', 'hero'
        yield 'props', {
            'title': self.title,
            'subtitle': self.subtitle,
        }
        yield 'children', [dict(self.action)] if self.action is not None else []


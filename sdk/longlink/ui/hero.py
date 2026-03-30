from dataclasses import field, dataclass
from longlink.ui.button import Button, ButtonVariants
from longlink.types.icons import IconTypes
from longlink.ui.__root__ import Component


@dataclass
class Hero(Component):
    """
    Header block component intended for top-level page sections.

    Purpose:
    - Communicates the primary context of the page (title + optional subtitle).
    - Optionally displays a leading icon for quick visual identification.
    - Optionally exposes a single primary action (Button), typically used
      for page-scoped operations (e.g., create, configure, open dialog).

    Structural characteristics:
    - Not a layout container; it does not stack arbitrary children.
    - Accepts at most one action Button.
    - Action is serialized as a child node for consistent schema shape.

    Serialization shape:
        {
            "type": "hero",
            "props": {
                "title": <str>,
                "subtitle": <str | null>,
                "icon": <IconTypes | null>
            },
            "children": [ <action_button_schema>? ]
        }

    The frontend is responsible for rendering:
    - Icon (if provided) to the left of the title
    - Subtitle beneath the title
    - Action button aligned according to layout rules
    """
    title: str
    subtitle: str | None = None
    icon: IconTypes | None = None
    action: Button | None = field(default=None)

    def button(
        self,
        text: str,
        variant: ButtonVariants = 'default',
        url: str | None = None,
    ) -> Button:
        button = Button(text=text, variant=variant, url=url)
        self.action = button
        return button

    def __iter__(self):
        yield 'type', 'hero'
        yield 'props', {
            'title': self.title,
            'subtitle': self.subtitle,
            'icon': self.icon,
        }
        yield 'children', [dict(self.action)] if self.action is not None else []


from .__root__ import Component
from dataclasses import dataclass

# TODO: Add a text in the separator like in the https://ui.shadcn.com/ example

@dataclass
class Separator(Component):
    """
    Stateless visual divider component.

    Purpose:
    - Introduces vertical spacing between adjacent components.
    - Provides a structural break without semantic meaning.
    - Has no configurable properties and no children.

    Serialization shape:
        {
            "type": "separator",
            "props": {},
            "children": []
        }

    Rendering responsibility is entirely delegated to the frontend,
    which decides visual style (line, spacing, subtle divider, etc.).
    """

    def __iter__(self):
        yield 'type', 'separator'
        yield 'props', {}
        yield 'children', []
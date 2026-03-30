from .__root__ import Component
from dataclasses import dataclass


@dataclass
class Checkbox(Component):
    """
    Standalone checkbox component.

    Serialization shape:
        {
            "type": "checkbox",
            "props": {
                "label": <str | null>,
                "description": <str | null>,
                "checked": <bool>
            },
            "children": []
        }
    """

    label: str | None = None
    description: str | None = None
    checked: bool = False

    def __iter__(self):
        props = {
            "label": self.label,
            "description": self.description,
            "checked": self.checked,
        }

        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "checkbox"
        yield "props", cleaned
        yield "children", []

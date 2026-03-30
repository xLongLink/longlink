from .__root__ import Component
from dataclasses import dataclass


@dataclass
class Textarea(Component):
    """
    Standalone textarea component.

    Serialization shape:
        {
            "type": "textarea",
            "props": {
                "label": <str | null>,
                "placeholder": <str | null>,
                "description": <str | null>
            },
            "children": []
        }
    """

    label: str | None = None
    placeholder: str | None = None
    description: str | None = None

    def __iter__(self):
        props = {
            "label": self.label,
            "placeholder": self.placeholder,
            "description": self.description,
        }

        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "textarea"
        yield "props", cleaned
        yield "children", []

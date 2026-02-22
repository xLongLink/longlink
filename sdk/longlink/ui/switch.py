from dataclasses import dataclass

from .__root__ import Component


@dataclass
class Switch(Component):
    """
    Standalone switch/toggle component.

    Serialization shape:
        {
            "type": "switch",
            "props": {
                "label": <str | null>,
                "description": <str | null>,
                "active": <bool>
            },
            "children": []
        }
    """

    label: str | None = None
    description: str | None = None
    active: bool = False

    def __iter__(self):
        props = {
            "label": self.label,
            "description": self.description,
            "active": self.active,
        }

        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "switch"
        yield "props", cleaned
        yield "children", []

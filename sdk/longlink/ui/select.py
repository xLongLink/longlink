from dataclasses import dataclass
import re

from .__root__ import Component


@dataclass
class Select(Component):
    """
    Standalone select component.

    Serialization shape:
        {
            "type": "select",
            "props": {
                "name": <str>,
                "label": <str | null>,
                "value": <str | null>,
                "placeholder": <str | null>,
                "description": <str | null>,
                "options": <list[dict[str, str]]>,
                "required": <bool>,
                "disabled": <bool>,
                "submit": <str | null>
            },
            "children": []
        }
    """

    options: list[dict[str, str]]
    name: str | None = None
    label: str | None = None
    value: str | None = None
    placeholder: str | None = None
    description: str | None = None
    required: bool = False
    disabled: bool = False
    submit: str | None = None

    def __post_init__(self) -> None:
        if self.name is None:
            if self.label:
                normalized = re.sub(r"[^a-z0-9]+", "_", self.label.lower()).strip("_")
                self.name = normalized or "select"
            else:
                self.name = "select"

    def __iter__(self):
        props = {
            "name": self.name,
            "label": self.label,
            "value": self.value,
            "placeholder": self.placeholder,
            "description": self.description,
            "options": self.options,
            "required": self.required,
            "disabled": self.disabled,
            "submit": self.submit,
        }

        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "select"
        yield "props", cleaned
        yield "children", []

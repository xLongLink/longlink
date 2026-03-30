import re
from typing import Any, Literal, TypeAlias
from .__root__ import Component
from dataclasses import field, dataclass

InputKinds: TypeAlias = Literal[
    "text",
    "number",
    "password",
    "textarea",
    "date",
    "datetime",
]


@dataclass
class Input(Component):
    """
    Generic standalone input component.

    Design goals:
    - Usable independently (not bound to a form container)
    - Declarative and transport-safe
    - Backend-driven event handling
    - Polymorphic via `kind`

    Behavior:
    - If `submit` is provided, frontend emits a "submit" event.
    - Otherwise, frontend emits "change" events immediately.
    - `name` identifies the field in backend handlers.

    Serialization shape:
        {
            "type": "input",
            "props": {
                "kind": <InputKinds>,
                "name": <str>,
                "label": <str | null>,
                "value": <Any>,
                "placeholder": <str | null>,
                "description": <str | null>,
                "required": <bool>,
                "disabled": <bool>,
                "submit": <str | null>
            },
            "children": []
        }
    """

    # Core identity
    name: str | None = None
    kind: InputKinds = "text"

    # UI metadata
    label: str | None = None
    value: Any = None
    placeholder: str | None = None
    description: str | None = None

    # State flags
    required: bool = False
    disabled: bool = False

    # Optional inline submit button
    submit: str | None = None

    def __post_init__(self) -> None:
        """
        Validate configuration constraints.
        """
        if self.name is None:
            if self.label:
                normalized = re.sub(r"[^a-z0-9]+", "_", self.label.lower()).strip("_")
                self.name = normalized or "input"
            else:
                self.name = "input"

    def __iter__(self):
        props = {
            "kind": self.kind,
            "name": self.name,
            "label": self.label,
            "value": self.value,
            "placeholder": self.placeholder,
            "description": self.description,
            "required": self.required,
            "disabled": self.disabled,
            "submit": self.submit,
        }

        # Remove None values to keep schema clean
        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "input"
        yield "props", cleaned
        yield "children", []

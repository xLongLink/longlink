from .__root__ import Component
from dataclasses import field, dataclass


@dataclass
class Range(Component):
    """
    Standalone range slider component.

    Serialization shape:
        {
            "type": "range",
            "props": {
                "label": <str | null>,
                "description": <str | null>,
                "min": <float>,
                "max": <float>,
                "step": <float>,
                "value": <list[float]>
            },
            "children": []
        }
    """

    label: str | None = None
    description: str | None = None
    min: float = 0
    max: float = 100
    step: float = 1
    value: list[float] = field(default_factory=lambda: [0, 100])

    def __post_init__(self) -> None:
        if self.min > self.max:
            raise ValueError("'min' must be lower than or equal to 'max'.")

        if self.step <= 0:
            raise ValueError("'step' must be greater than 0.")

        if len(self.value) != 2:
            raise ValueError("'value' must contain exactly two numbers.")

    def __iter__(self):
        props = {
            "label": self.label,
            "description": self.description,
            "min": self.min,
            "max": self.max,
            "step": self.step,
            "value": self.value,
        }

        cleaned = {k: v for k, v in props.items() if v is not None}

        yield "type", "range"
        yield "props", cleaned
        yield "children", []

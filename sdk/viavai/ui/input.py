from typing import Literal, TypeAlias
from dataclasses import dataclass, field
from .__root__ import Component


# Generic input. This can be extended to support specific types of input, like text, number, select, etc. For now, it's just a placeholder.


@dataclass
class Input(Component):
    label: str | None = None
    placeholder: str | None = None
    description: str | None = None
    submit: str | None = None # Text of the submit button, if any

    def __iter__(self):
        yield 'type', 'input'
        yield 'props', {
            'label': self.label,
            'placeholder': self.placeholder,
            'description': self.description,
            'submit': self.submit,
        }
        yield 'children', []

from typing import Literal
from .input import Input
from .__root__ import Component
from dataclasses import field, dataclass

FormMethods = Literal["post", "put", "patch", "delete"]


@dataclass
class FormRow(Component):
    """
    Horizontal grouping container inside a Form.

    Children are rendered side-by-side.
    Used to place multiple fields on the same visual row.
    """

    _children: list[Component] = field(default_factory=list)

    def input(self, input_component: Input) -> Input:
        self._children.append(input_component)
        return input_component

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "formRow"
        yield "props", {}
        yield "children", [dict(child) for child in self._children]


@dataclass
class Form(Component):
    """
    Vertical form container.

    Behavior:
    - Stacks children vertically.
    - Can contain Input components directly.
    - Can contain FormRow components for horizontal grouping.
    - Emits a single submit event containing all field values.
    """

    name: str
    submit: str | None = "Submit"
    method: FormMethods = "post"

    _children: list[Component] = field(default_factory=list)

    # --- Vertical children ---

    def input(self, input_component: Input) -> Input:
        self._children.append(input_component)
        return input_component

    def row(self) -> FormRow:
        """
        Create a horizontal row inside the form.
        """
        row = FormRow()
        self._children.append(row)
        return row

    def add(self, component: Component) -> Component:
        self._children.append(component)
        return component

    def __iter__(self):
        yield "type", "form"
        yield "props", {
            "name": self.name,
            "method": self.method,
            "submit": self.submit,
        }
        yield "children", [dict(child) for child in self._children]
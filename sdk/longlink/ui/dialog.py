from .__root__ import Component
from dataclasses import dataclass, field
from typing import Any


# Import Components
from .input import Input, InputKinds
from .range import Range


@dataclass
class Dialog(Component):
    confirm: str = 'Confirm'
    cancel: str = 'Cancel'
    _components: list[Component] = field(default_factory=list)

    def hero(self, title: str, subtitle: str | None = None) -> 'Hero':
        from .hero import Hero

        hero = Hero(title=title, subtitle=subtitle)
        self._components.append(hero)
        return hero
  
    def input(
        self,
        name: str | None = None,
        kind: InputKinds = "text",
        label: str | None = None,
        value: Any = None,
        placeholder: str | None = None,
        description: str | None = None,
        options: list[dict[str, str]] | None = None,
        required: bool = False,
        disabled: bool = False,
        submit: str | None = None,
    ) -> Input:
        input_component = Input(
            name=name,
            kind=kind,
            label=label,
            value=value,
            placeholder=placeholder,
            description=description,
            options=options,
            required=required,
            disabled=disabled,
            submit=submit,
        )
        self._components.append(input_component)
        return input_component


    def range(
        self,
        label: str | None = None,
        description: str | None = None,
        min: float = 0,
        max: float = 100,
        step: float = 1,
        value: list[float] | None = None,
    ) -> Range:
        range_component = Range(
            label=label,
            description=description,
            min=min,
            max=max,
            step=step,
            value=value if value is not None else [min, max],
        )
        self._components.append(range_component)
        return range_component

    def __iter__(self):
        yield 'type', 'dialog'
        yield 'props', {
            'confirm': self.confirm,
            'cancel': self.cancel,
        }
        yield 'children', [dict(component) for component in self._components]

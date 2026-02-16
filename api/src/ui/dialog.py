from dataclasses import dataclass, field
from src.ui.__root__ import Component


# Importing components that can be used in a Page
from src.ui.hero import Hero
from src.ui.input import Input


@dataclass
class Dialog(Component):
    confirm: str = 'Confirm'
    cancel: str = 'Cancel'
    _components: list[Component] = field(default_factory=list)

    def hero(self, title: str, subtitle: str | None = None) -> Hero:
        hero = Hero(title=title, subtitle=subtitle)
        self._components.append(hero)
        return hero
  
    def input(
        self,
        label: str | None = None,
        placeholder: str | None = None,
        description: str | None = None,
        submit: str | None = None,
    ) -> Input:
        input_component = Input(
            label=label,
            placeholder=placeholder,
            description=description,
            submit=submit,
        )
        self._components.append(input_component)
        return input_component

    def __iter__(self):
        yield 'type', 'dialog'
        yield 'props', {
            'confirm': self.confirm,
            'cancel': self.cancel,
        }
        yield 'children', [dict(component) for component in self._components]

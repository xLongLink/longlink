from dataclasses import dataclass, field

from .table import Table


@dataclass
class Dialog:
    confirm: str = 'Confirm'
    cancel: str = 'Cancel'
    _components: list[Table] = field(default_factory=list)

    def table(self, data: list[dict] | None = None) -> Table:
        table = Table(data=data)
        self._components.append(table)
        return table

    def __iter__(self):
        yield 'type', 'dialog'
        yield 'props', {
            'confirm': self.confirm,
            'cancel': self.cancel,
        }
        yield 'children', [dict(component) for component in self._components]

from .table import Table


class Dialog:
    confirm: str
    cancel: str

    def __init__(self, confirm: str = 'Confirm', cancel: str = 'Cancel'):
        self.confirm = confirm
        self.cancel = cancel
        self._components = []

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

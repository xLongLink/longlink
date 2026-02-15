from typing import Literal
from .dialog import Dialog


class Button:
    text: str
    variant: Literal['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']

    def __init__(
        self,
        text: str,
        variant: Literal['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] = 'default',
    ):
        self.text = text
        self.variant = variant
        self._dialog: Dialog | None = None

    def dialog(self, confirm: str = 'Confirm', cancel: str = 'Cancel') -> Dialog:
        self._dialog = Dialog(confirm=confirm, cancel=cancel)
        return self._dialog

    def __iter__(self):
        yield 'type', 'button'
        yield 'props', {
            'text': self.text,
            'variant': self.variant,
        }

        if self._dialog is not None:
            yield 'children', [dict(self._dialog)]

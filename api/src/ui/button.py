from dataclasses import dataclass, field
from typing import Literal, TypeAlias
from .dialog import Dialog


ButtonVariants: TypeAlias = Literal[
    'default',
    'outline',
    'secondary',
    'ghost',
    'destructive',
    'link'
]


@dataclass
class Button:
    """
    This is very straightforward, it either open a dialog, or call en endpoint when clicked.
    """

    text: str
    variant: ButtonVariants
    _dialog: Dialog | None = field(default=None)

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

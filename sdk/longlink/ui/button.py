from typing import Literal, TypeAlias
from dataclasses import dataclass, field
from .__root__ import Component


# Importing components that can be used in a Button dialog
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
class Button(Component):
    """LongLink Button component the button never contains client side logic.
    It has two functionalities:
    1) Opening a dialog: Some data visualization or form. But then the logic it managed by a different component.

    2) Call an endpoint: 
    - Export / Download: The endpoint returns a file that can be viewed in a dialog, or downloaded directly.
    - Trigger an action in the backend, like sending an email, or creating a new resource, in that case a Toaster show the result of the action.
    - If the endpoint is a page, then the page will be reloaded with the new data
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

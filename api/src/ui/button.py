from typing import Literal


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

    def __iter__(self):
        yield 'type', 'button'
        yield 'text', self.text
        yield 'variant', self.variant

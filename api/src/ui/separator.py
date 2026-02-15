from typing import Literal


class Separator:
    orientation: Literal['horizontal', 'vertical']

    def __init__(self, orientation: Literal['horizontal', 'vertical'] = 'horizontal'):
        self.orientation = orientation

    def __iter__(self):
        yield 'type', 'separator'
        yield 'orientation', self.orientation

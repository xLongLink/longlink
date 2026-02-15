class Separator:
    def __init__(self):
        pass

    def __iter__(self):
        yield 'type', 'separator'
        yield 'props', {}

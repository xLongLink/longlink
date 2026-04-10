# Card

`Card` groups related UI elements inside a visual container.

## What it is for

Use `Card` to create dashboard widgets, grouped settings blocks, or isolated information panels.

## Available methods

- `Card(title=None, subtitle=None)`
- `Card.hero(...)`
- `Card.table(data)`
- `Card.input(input_component)`
- `Card.button(...)`
- `Card.columns(widths)`
- `Card.separator()`
- `Card.tabs(names)`
- `Card.range(...)`
- `Card.add(component)`

## Request models

- `title`
- `subtitle`

## Returned models

- `Card.columns(widths)` returns `list[Column]`
- `Card.tabs(names)` returns `list[Tab]`
- Other helper methods return the created component

## Example

```py
from longlink.ui.card import Card

card = Card(title="Usage", subtitle="Last 30 days")
card.range(label="Threshold", min=0, max=100, value=[20, 80])
card.button(text="Export", variant="outline")
```

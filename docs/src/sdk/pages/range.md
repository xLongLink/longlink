# Range

`Range` renders a numeric interval slider.

## What it is for

Use `Range` to select a minimum and maximum value within a bounded interval.

## Available methods

- `Page.range(...)`
- `Column.range(...)`
- `Tab.range(...)`
- `Card.range(...)`
- `Dialog.range(...)`
- `Range(...)`

## Request models

- `label`
- `description`
- `min`
- `max`
- `step`
- `value`

## Returned models

Container helpers return a `Range`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.range(label="Budget", min=0, max=10000, step=500, value=[1000, 5000])
```

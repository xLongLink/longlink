# Columns

`Columns` creates a horizontal layout with one or more `Column` children.

## What it is for

Use `Columns` when content should be displayed side by side instead of in the default vertical flow.

## Available methods

- `Page.columns(widths)`
- `Tab.columns(widths)`
- `MenuSection.columns(widths)`
- `MenuSubSection.columns(widths)`
- `Card.columns(widths)`
- `Columns.column(width)`

## Request models

### `Columns`

- `widths`: generated from the column widths you register

### `Column`

- `width`: relative width of the column before normalization

## Returned models

- `Columns.column(width)` returns a `Column`
- Container helper methods such as `page.columns([2, 1])` return a `list[Column]`

## Example

```py
from longlink.ui.page import Page

page = Page()
left, right = page.columns([2, 1])

left.hero(title="Overview")
left.table(data=[{"name": "Alice"}])

right.button(text="Create user")
```

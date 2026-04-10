# Table

`Table` renders tabular data from a list of dictionaries.

## What it is for

Use `Table` when a page needs to present datasets with stable columns and repeated rows.

## Available methods

- `Page.table(data)`
- `Column.table(data)`
- `Tab.table(data)`
- `MenuSection.table(data)`
- `MenuSubSection.table(data)`
- `Card.table(data)`
- `Table.column(...)`

## Request models

### `Table`

- `data`

### `Table.column(...)`

- `key`
- `label`
- `content`
- `detail`
- `align`

## Returned models

- Container helpers return a `Table`
- `Table.column(...)` returns a table `Column`

## Example

```py
from longlink.ui.page import Page

page = Page()
table = page.table(
    data=[
        {"name": "Marketing", "owner": "Alice", "budget": "$12,000"},
        {"name": "Website", "owner": "Bruno", "budget": "$8,000"},
    ]
)

table.column("name", label="Project")
table.column("owner", label="Owner")
table.column("budget", label="Budget", align="right")
```

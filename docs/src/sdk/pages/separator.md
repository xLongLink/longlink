# Separator

`Separator` is a stateless visual divider.

## What it is for

Use `Separator` to add a clear visual break between adjacent components.

## Available methods

- `Page.separator()`
- `Column.separator()`
- `Tab.separator()`
- `MenuSection.separator()`
- `MenuSubSection.separator()`
- `Card.separator()`
- `Separator()`

## Request models

`Separator` has no public props.

## Returned models

Container helpers return a `Separator`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.hero(title="Billing")
page.separator()
page.table(data=[{"invoice": "INV-001"}])
```

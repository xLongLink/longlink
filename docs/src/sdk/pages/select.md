# Select

`Select` renders a standalone dropdown field.

## What it is for

Use `Select` when the user must pick a single value from a predefined list.

## Available methods

- `Page.select(...)`
- `Tab.select(...)`
- `MenuSection.select(...)`
- `MenuSubSection.select(...)`
- `Dialog.select(...)`
- `Select(...)`

## Request models

- `options`
- `name`
- `label`
- `value`
- `placeholder`
- `description`
- `required`
- `disabled`
- `submit`

## Returned models

Container helpers return a `Select`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.select(
    label="Role",
    options=[
        {"label": "Admin", "value": "admin"},
        {"label": "Viewer", "value": "viewer"},
    ],
    submit="Apply",
)
```

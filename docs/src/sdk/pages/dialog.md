# Dialog

`Dialog` is a modal container attached to a `Button`.

## What it is for

Use `Dialog` when an action requires focused confirmation or a short embedded form.

## Available methods

- `Button.dialog(confirm="Confirm", cancel="Cancel")`
- `Dialog.hero(...)`
- `Dialog.input(...)`
- `Dialog.select(...)`
- `Dialog.range(...)`

## Request models

- `confirm`
- `cancel`

## Returned models

- `Button.dialog(...)` returns a `Dialog`
- Dialog helper methods return the nested component they create

## Example

```py
from longlink.ui.page import Page

page = Page()
dialog = page.button(text="Delete", variant="destructive").dialog(
    confirm="Delete",
    cancel="Cancel",
)
dialog.hero(title="Delete project", subtitle="This action cannot be undone")
```

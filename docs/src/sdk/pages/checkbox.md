# Checkbox

`Checkbox` renders a boolean field with a checkbox control.

## What it is for

Use `Checkbox` for explicit opt-in or confirmation flows.

## Available methods

- `Page.checkbox(label=None, description=None, checked=False)`
- `Checkbox(...)`

## Request models

- `label`
- `description`
- `checked`

## Returned models

`Page.checkbox(...)` returns a `Checkbox`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.checkbox(
    label="Accept terms",
    description="Required before continuing",
    checked=False,
)
```

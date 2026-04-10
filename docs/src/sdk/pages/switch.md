# Switch

`Switch` renders a boolean toggle.

## What it is for

Use `Switch` for on or off settings with immediate visual state.

## Available methods

- `Page.switch(label=None, description=None, active=False)`
- `Switch(...)`

## Request models

- `label`
- `description`
- `active`

## Returned models

`Page.switch(...)` returns a `Switch`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.switch(label="Enable alerts", description="Send email notifications", active=True)
```

# Button

`Button` triggers a backend action, opens a URL, or opens a dialog.

## What it is for

Use `Button` for explicit user actions such as creating a resource, refreshing data, or opening a modal flow.

## Available methods

- `Page.button(text, variant="default", url=None)`
- `Column.button(...)`
- `Tab.button(...)`
- `MenuSection.button(...)`
- `MenuSubSection.button(...)`
- `Card.button(...)`
- `Hero.button(...)`
- `Button.click(url)`
- `Button.dialog(confirm="Confirm", cancel="Cancel")`

## Request models

- `text`
- `variant`
- `url`

## Returned models

- Container helpers return a `Button`
- `Button.dialog(...)` returns a `Dialog`

## Example

```py
from longlink.ui.page import Page

page = Page()
button = page.button(text="Invite user", variant="secondary")
dialog = button.dialog(confirm="Send invite", cancel="Cancel")
dialog.input(label="Email", submit="Invite")
```

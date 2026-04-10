# Input

`Input` is the generic standalone field component.

## What it is for

Use `Input` for text, number, password, textarea, date, and datetime input flows.

## Available methods

- `Page.input(...)`
- `Tab.input(...)`
- `MenuSection.input(...)`
- `MenuSubSection.input(...)`
- `Dialog.input(...)`
- `Input(...)`

## Request models

- `name`
- `kind`
- `label`
- `value`
- `placeholder`
- `description`
- `required`
- `disabled`
- `submit`

## Returned models

Container helpers return an `Input`.

## Example

```py
from longlink.ui.page import Page

page = Page()
page.input(
    label="Workspace name",
    placeholder="Acme",
    description="Displayed in the header",
    submit="Save",
)
```

# Textarea

`Textarea` is a dedicated multiline text component.

## What it is for

Use `Textarea` when you need a simple multiline field without using `Input(kind="textarea")`.

## Available methods

- `Textarea(label=None, placeholder=None, description=None)`

## Request models

- `label`
- `placeholder`
- `description`

## Returned models

Instantiating `Textarea(...)` returns a `Textarea` component that can be attached to a container that accepts generic components.

## Example

```py
from longlink.ui.textarea import Textarea

notes = Textarea(
    label="Notes",
    placeholder="Write additional context",
    description="Visible to administrators only",
)
```

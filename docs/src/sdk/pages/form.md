# Form

`Form` groups inputs into a single submit boundary.

## What it is for

Use `Form` when multiple fields must be submitted together as one backend action.

## Available methods

- `Form(name, submit="Submit", method="post")`
- `Form.input(input_component)`
- `Form.row()`
- `Form.add(component)`
- `FormRow.input(input_component)`
- `FormRow.add(component)`

## Request models

### `Form`

- `name`
- `submit`
- `method`

### `FormRow`

- No public props

## Returned models

- `Form.row()` returns a `FormRow`
- Other helper methods return the component they append

## Example

```py
from longlink.ui.form import Form
from longlink.ui.input import Input

form = Form(name="create_user", submit="Create user")
row = form.row()
row.input(Input(label="First name"))
row.input(Input(label="Last name"))
form.input(Input(label="Email", kind="text"))
```

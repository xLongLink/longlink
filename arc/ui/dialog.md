# Dialog

`Dialog` is a modal container used for confirm/cancel interactions.

## Main properties
- `confirm` (str, default `Confirm`)
- `cancel` (str, default `Cancel`)

## Behavior
- Can contain nested UI children.
- Often attached from `Button.dialog(...)`.
- Serializes as `type: dialog`.

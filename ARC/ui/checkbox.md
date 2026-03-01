# Checkbox

`Checkbox` is a standalone boolean input component.

## Main properties
- `label` (optional str)
- `description` (optional str)
- `checked` (bool, default `False`)

## Behavior
- Serializes as `type: checkbox`.
- Produces no children.
- Omits `None` optional fields from serialized props.

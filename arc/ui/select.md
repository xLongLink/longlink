---
component: Select
sdk: longlink/ui/select.py
web: src/components/longlink/Select.tsx
---

# Select

`Select` is a standalone option picker.

## Main properties
- `options` (list of option objects)
- `name`, `label`, `value`, `placeholder`, `description`
- `required`, `disabled`
- `submit` (optional endpoint/event target)

## Behavior
- Renders a controlled list of options.
- Can be used inside forms or as a standalone interactive field.
- Serializes as `type: select`.

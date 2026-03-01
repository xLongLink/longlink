---
component: Textarea
sdk: longlink/ui/textarea.py
web: src/components/longlink/Textarea.tsx
---

# Textarea

`Textarea` is a multiline text input component.

## Main properties
- `label` (optional str)
- `placeholder` (optional str)
- `description` (optional str)

## Behavior
- Serializes as `type: textarea`.
- Emits no children.
- Optional `None` fields are excluded from serialized props.

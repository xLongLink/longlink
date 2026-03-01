---
component: Range
sdk: longlink/ui/range.py
web: src/components/longlink/Range.tsx
---

# Range

`Range` is a numeric interval selector.

## Main properties
- `label` (optional str)
- `description` (optional str)
- `min`, `max`, `step`
- `value` (usually `[min_value, max_value]`)

## Behavior
- Represents bounded numeric ranges for filtering or thresholds.
- Serializes as `type: range`.

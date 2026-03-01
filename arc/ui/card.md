# Card

`Card` is a visual container used to group related content.

## Purpose
- Structure content in vertically stacked blocks.
- Optionally show `title` and `subtitle` metadata.

## Main properties
- `title` (optional str)
- `subtitle` (optional str)

## Behavior
- Supports composition helpers (`hero`, `table`, `input`, `button`, `columns`, `separator`, `tabs`, `range`, `add`).
- Serializes as `type: card` with nested children.

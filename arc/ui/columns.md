# Columns and Column

`Columns` defines a horizontal layout, and `Column` is each vertical lane inside it.

## Purpose
- Build explicit horizontal grouping in the server-driven layout.
- Populate each column with nested components.

## Column
- Property: `width` (relative width/weight).
- Accepts composed children (hero, table, input, button, separator, tabs, range, etc.).
- Serializes as `type: column`.

## Columns
- Holds an ordered list of `Column` items.
- `.column(width)` appends a new column and returns it.
- Serializes as `type: columns` with child columns.

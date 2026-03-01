---
component: Table
sdk: longlink/ui/table.py
web: src/components/longlink/Table.tsx
---

# Table and Table Column

`Table` renders structured row data, and its table-specific `Column` describes per-column presentation.

## Table
- Main property: `data` (`list[dict]`) as raw row payload.
- Supports column definitions for labels, keys, and display behavior.
- Serializes as `type: table`.

## Table Column
- Column metadata model used by `Table`.
- Defines field binding and presentation semantics.
- Serializes as `type: column` in table context.

## Cell model
- Supports value metadata like text, bold style, and optional link.

# Component (Base Class)

`Component` is the abstract base for SDK UI elements.

## Purpose
- Enforce the common server-driven serialization contract.
- Standardize output shape as:
  - `type`
  - `props`
  - `children`

## Behavior
- `__iter__` emits a minimal default schema.
- Concrete components override/extend serialization as needed.

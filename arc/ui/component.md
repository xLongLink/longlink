---
component: Component
sdk: longlink/ui/__root__.py
web: src/components/Render.tsx
---

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

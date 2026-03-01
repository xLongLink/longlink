---
component: Page
sdk: longlink/ui/page.py
web: src/components/longlink/Page.tsx
---

# Page

`Page` is the root UI container returned by SDK handlers.

## Purpose
- Top-level composition boundary for all visible components.
- Defines metadata such as page title and optional navigation context.

## Behavior
- Exposes helper methods to add supported child components.
- Serializes to the canonical server-driven schema (`type`, `props`, `children`).
- Serves as the primary payload consumed by the frontend renderer.

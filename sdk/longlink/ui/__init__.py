"""
\*\*We are building a server-driven UI SDK with a Python-first authoring model and a frontend runtime renderer.

Architecture:

- The backend (Python) is the single source of truth.
- UI is composed as a hierarchical component tree.
- Each component serializes via **iter** into a JSON-like schema:
  {
  "type": "<component_type>",
  "props": { ... },
  "children": [ ... ]
  }
- The frontend only renders the schema and emits events.
- No UI business logic lives in the browser.
- All state transitions originate from the backend.

Design principles:

1. Components must be:
    - Declarative
    - Fully JSON-serializable
    - Stateless on the frontend
    - Backend-authoritative

2. Layout philosophy:
    - Default flow is vertical stacking.
    - Horizontal grouping requires explicit container components.
    - Layout containers:
        - Page (root)
        - Columns / Column
        - Tabs / Tab
        - Menu / Section / SubSection
        - Form / FormRow
        - Card
    - Containers own their subtree and serialize children.

3. Input philosophy:
    - Single polymorphic Input with `kind`.
    - Standalone inputs allowed (not only inside forms).
    - Forms are submission boundaries.
    - No frontend validation logic.
    - Events are standardized:
      {
      "component": "<type>",
      "name": "<field>",
      "event": "change" | "submit",
      "value": ...
      }

4. Feedback components:
    - Toast / Notification (non-blocking)
    - Dialog (modal container)
    - Field-level error support

5. Forms:
    - Vertical container by default.
    - Horizontal grouping via FormRow.
    - Single atomic submit event.

6. Table:
    - Receives raw data.
    - Columns define rendering.
    - Cell supports:
      {
      "value": "...",
      "bold": bool,
      "link": "..."
      }

7. Cards:
    - Visual grouping container.
    - Vertically stacked children.
    - Optional header metadata.

When designing a new component:

- Maintain the "type / props / children" contract.
- Keep frontend dumb; backend owns logic.
- Avoid embedding behavior in components.
- Prefer composition over specialization.
- Ensure consistent event contract.
- Keep props minimal and extensible.
- Avoid overengineering v1.

Now design a new component that fits this architecture.
Provide:

- Dataclass implementation
- Serialization structure
- Event contract (if applicable)
- Usage example
- Design reasoning\*\*
"""


from .page import Page

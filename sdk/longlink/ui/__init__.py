"""
Server-driven UI SDK.

The backend (Python) is the single source of truth for UI structure and logic.

Authoring model:
- Developers compose the interface declaratively using a Page root element.
- Page and nested Components form a hierarchical component tree.
- Each component serializes itself into a structured schema:
    {
        "type": <component_type>,
        "props": { ... },
        "children": [ ... ]
    }

Runtime model:
- The serialized schema is sent to a web frontend.
- The frontend acts as a renderer only:
    - It interprets the schema.
    - It maps component types to concrete UI elements.
    - It emits user interaction events back to the backend.
- The browser does not contain UI business logic.
- All UI state transitions and structural updates originate from Python.
"""


from .page import Page

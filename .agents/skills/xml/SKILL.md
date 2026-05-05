---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

## Structure

```text
longlink/
├── sdk/
│   ├── longlink/
│   │   ├── .static/xsd/         # XML schema definitions
│   │   │   ├── base.xsd         # Shared schema base
│   │   │   ├── react/           # React-backed component contracts
│   │   │   ├── primitives/      # Page/state/query/iteration contracts
│   │   │   ├── html/            # HTML bridge contracts
│   │   │   └── llm/SCHEMA.md    # Human-readable schema guide
│   │   ├── routes/              # XML page metadata and page routes
│   │   │   ├── metadata.py      # Metadata route helpers
│   │   │   └── pages.py         # Page route helpers
│   │   ├── utils/               # XML helpers and page utilities
│   │   │   ├── xml.py           # XML utility helpers
│   │   │   ├── metadata.py      # Metadata utilities
│   │   │   └── page.py          # Page utilities
│   │   ├── app.py               # SDK app entrypoint
│   │   ├── router.py            # SDK router wiring
│   │   └── constants.py         # Shared SDK constants
│   └── tests/xml/               # SDK XML tests
│       ├── react/               # React-backed component behavior tests
│       ├── primitives/          # Primitive behavior tests
│       └── html/                # HTML bridge behavior tests
├── web/
│   ├── src/xml/                # XML runtime parser/renderer and domain groupings
│   │   ├── react/              # XML React-backed components and layout widgets
│   │   ├── primitives/         # Low-level XML primitives
│   │   └── html/               # HTML/XML bridge tags
│   ├── src/components/         # Shared UI logic and primitives
│   └── tests/xml/              # Web XML runtime and component rendering behavior
│       ├── react/              # XML React-backed component tests
│       ├── primitives/         # XML primitive tests
│       └── html/               # HTML/XML bridge tests
├── api/
│   └── src/pages/              # XML pages used by control-plane views
├── sdk/sample/src/pages/       # Sample XML pages and fixtures
└── docs/
    └── src/xml/                # XML documentation pages
        ├── index.md            # XML docs entry
        ├── components.md       # XML react docs
        ├── layout.md           # XML layout docs
        ├── primitives.md       # XML primitives docs
        └── html.md             # XML HTML bridge docs
```

## Responsibilities

- Use `sdk/longlink/.static/llm/SCHEMA.md` as the primary XML schema guide.
- Keep schema (`xsd`), runtime, pages, and docs aligned. Especially for the attributes.
- Verify XML tags and attributes mean the same thing across SDK, web, and docs.
- Check that component placement matches ownership boundaries.
- Check that renderer behavior matches schema contract and page usage.
- Check that sample pages and API pages reflect the final XML shape.
- Check that documentation describes the final behavior, not an intermediate state.
- Remove obsolete XML flow when replacement is complete.
- Keep llm/SCHEMA.md up to date. Using the content of the markdown file, one shall be able to create a valid XML page without needing to reference the SDK code.

## How it works

**Tags → Components**: \
Each XML tag maps directly to a React component that controls rendering and behavior.

**Attributes → Props**: \
XML attributes become component props, defining configuration and data inputs.

**State and Data (`<State>`, `<Query>`)**: \
Both use an `id` to define a reusable state slot:

- `<State id="user" value="John Doe" />` \
  Creates local state → `user.value === "John Doe"`
- `<Query id="user" path="/endpoint" />` \
  Fetches data into state → e.g. `{ name: "John Doe" }` → `user.name`

**Conditional Rendering (`if`)**: \
Any tag can include `if="condition"`, If false, the element is not rendered.

**Expressions (`{}`)**: \
Curly braces evaluate JavaScript-like expressions using state: `Hello, {user.name}` → `Hello, John Doe`

**State Reset / Refetch (`reset`)**:

- On `<State>` → resets to initial value
- On `<Query>` → triggers refetch

**Two-way Binding (`bind:`)**: \
Syncs component props with state: `<Input bind:value="user.name" />` Updates flow both ways (UI ↔ state)

**Iteration (`<For>`)**: \
Loop over arrays: `<For each="orders" as="order"> ... </For>`

**Actions (`<Button>` and similar)**: \
Trigger API calls, Sends request on click, `invalidate` causes related queries to refetch afterward

```xml
<Button action="/issues" method="POST"  payload='{"title":"{issue.title}"}' invalidate="issues">
    Save
</Button>
```

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
│   │   │   ├── components/      # Component contracts
│   │   │   ├── layout/          # Layout contracts
│   │   │   ├── html/            # HTML bridge contracts
│   │   │   └── tables/          # Table-related contracts
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
│       ├── components/          # Component behavior tests
│       ├── layout/              # Layout behavior tests
│       └── html/                # HTML bridge behavior tests
├── web/
│   ├── src/xml/                # XML runtime parser/renderer and domain groupings
│   │   ├── components/         # XML components
│   │   ├── layout/             # XML layout primitives
│   │   ├── primitives/         # Low-level XML primitives
│   │   └── html/               # HTML/XML bridge tags
│   ├── src/components/         # Shared UI logic and primitives
│   └── tests/xml/              # Web XML runtime and component rendering behavior
│       ├── components/         # XML component tests
│       ├── layout/             # XML layout tests
│       ├── primitives/         # XML primitive tests
│       └── html/               # HTML/XML bridge tests
├── api/
│   └── src/pages/              # XML pages used by control-plane views
├── sdk/sample/src/pages/       # Sample XML pages and fixtures
└── docs/
    └── src/xml/                # XML documentation pages
        ├── index.md            # XML docs entry
        ├── components.md       # XML components docs
        ├── layout.md           # XML layout docs
        ├── primitives.md       # XML primitives docs
        └── html.md             # XML HTML bridge docs
```

## Responsibilities

- Keep schema, runtime, pages, and docs aligned.
- Verify XML tags and attributes mean the same thing across SDK, web, and docs.
- Check that component placement matches ownership boundaries.
- Check that renderer behavior matches schema contract and page usage.
- Check that sample pages and API pages reflect the final XML shape.
- Check that documentation describes the final behavior, not an intermediate state.
- Remove obsolete XML flow when replacement is complete.

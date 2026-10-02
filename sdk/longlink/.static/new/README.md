<div align="center">

# Solution Template

Build a process-specific business application. \
All the data, logic and configurations are defined as code. \
Use your favorite AI tool with full context on the solution.

</div>

<br />

## Getting Started

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) to get started

```bash
uv sync
uv run longlink dev
```

## Views

Write interfaces in `src/views/*.jsx`, exporting a default React component.
The shared frontend compiles JSX in an opaque-origin sandbox and supplies React,
LongLink components, `params`, `request`, `navigate`, and `useApi`.
No Node, package imports, or frontend build is needed in this
Python project. Titles come from filenames (`items.jsx` → Items,
`[item].jsx` → Item), and tabs use the default icon. No metadata files are needed.

Use ordinary JSX expressions, React state, and controlled input callbacks.
`request('/api/items')` accesses only this Solution through a validated host
bridge. Direct network access, parent-window access, and Platform credentials
are not available. External resources are blocked. Image attachment previews
use the bridge; PDFs and other active document previews are intentionally not
supported in the sandbox.

Read required data with `const items = useApi('/api/items')`. The shared renderer
shows a loading spinner until data exists and an error banner with Retry if the
initial request fails. Views do not need loading/error branches. Background
refresh failures retain cached data. Cache keys are derived internally from the
full path, including query parameters. Successful writes through `request()`
automatically refresh cached data within this isolated View; no explicit
invalidation is needed. Use separate `useApi` calls for multiple resources (see
the invoice detail View). For optional resources, mount the component using
`useApi` only when needed.

VS Code supports `.jsx` natively. `jsconfig.json` and `frontend.d.ts` provide
local autocomplete without an extension. Run `uv run longlink docs ui` for
authoring APIs and inspect the sample invoice Views for complete examples.

<br />

## Migrate changes

After changing database models, generate and apply a new migration:

```bash
uv run longlink migrate
```

<br />

## Release

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --generate-notes
```

<br />

---

<div align="center">
LongLink 2026

</div>

---

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
LongLink components, `request`, `navigate`, and `useApi`.
No Node, package imports, or frontend build is needed in this
Python project. Titles come from filenames (`items.jsx` → Items,
`[item].jsx` → Item), and tabs use the default icon. No metadata files are needed.

Route parameters are passed as props to the default View function, not as globals.
For `src/views/items/[item].jsx`, visiting `/items/123` supplies `params.item` as `"123"`:

```jsx
/** @param {ViewProps} props */
export default function Item({ params }) {
    const [item] = useApi(`/api/items/${params.item}`);

    return <Heading>{item.name}</Heading>;
}
```

`params` is read-only and contains string-valued path parameters, not query parameters.

Use ordinary JSX expressions, React state, and controlled input callbacks.
`request('/api/items')` accesses only this Solution through a validated host
bridge. Direct network access, parent-window access, and Platform credentials
are not available. External resources are blocked. Image attachment previews
use the bridge; PDFs and other active document previews are intentionally not
supported in the sandbox.

For simple forms, use `<Form action="/api/..." method="post">` with named fields
and a `<Button type="submit">`. `name` preserves the themed Astryx controls, while
`defaultValue`, `defaultChecked`, `required`, and `disabled` work without
draft state. Use controlled values only when the interface needs reactive state.

`Form` validates before submitting, prevents duplicate requests, and displays
request errors. Submitted fields follow HTML semantics: strings, repeated names,
omitted unchecked checkboxes, and files. Receive schemas in Python routes as
`Annotated[Schema, fastapi.Form()]`; `python-multipart` is already a project dependency.
Successful writes refresh cached data without resetting the form. Use `onSuccess`
to close a dialog or navigate, or a reset button to restore defaults. The sample
invoice Views demonstrate both creation and file-upload forms.

Read required data with `const [items, invalidate] = useApi('/api/items')`. Call
`await invalidate()` to mark that exact path stale and refresh its active reads.
The shared renderer
shows a loading spinner until data exists and an error banner with Retry if the
initial request fails. Views do not need loading/error branches. Background
refresh failures retain cached data. Cache keys are derived internally from the
full path, including query parameters. Successful writes through `request()`
automatically refresh cached data within this isolated View; no explicit
invalidation is needed. Use separate `useApi` calls for multiple resources (see
the invoice detail View). For optional resources, mount the component using
`useApi` only when needed.

VS Code supports `.jsx` natively. `longlink dev` creates or refreshes the
SDK-owned `frontend.d.ts` in the project root. Together with `jsconfig.json`,
it provides local autocomplete without Node or an extension. The generated
file is ignored by Git; do not edit it, as the next development run replaces it.
Run `uv run longlink docs` for
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

---
name: xml
description: XML runtime adapters, versioning, Astryx alignment, and SDK XSD schemas. Use when changing XML components, props, schemas, or XML validation.
---

# XML

LongLink XML is versioned. Discover the target version from the XML document's
`<longlink version="…">` attribute, then work only in its matching runtime
directory: `web/src/xml/runtimes/<version>/`.

Keep the runtime, Astryx package alias, and SDK XSD contract aligned to that
version. Do not change another version unless the task explicitly requires it.

## Data Model

`<longlink>` is the document root. `State` and `Query` initialize data before
the UI renders; they are declarations, not visible components.

```xml
<longlink version="0.3">
  <State id="filters" status="open" />
  <Query id="issues" path="/issues?status=${filters.status}" />

  <For each="issues" as="issue">
    <Text value="${issue.title}" />
  </For>
</longlink>
```

## Expressions and Scope

- Use `${...}` for expressions and interpolation: `value="Issue: ${issue.title}"`.
- Read values with paths such as `issue.title`. Use `$state.property` only for
  writable control bindings.
- Expressions support safe values, property access, arrays, objects, arithmetic,
  comparisons, conditions, and selected built-ins. Arbitrary calls are rejected.

## State

`State` creates reactive page-local state. Its literal `id` is the state name;
every other attribute is an initial property.

```xml
<State id="filters" search="" status="open" />
<TextInput label="Search" value="$filters.search" />
```

- Bind controls with `$state.property`. State is recreated when its id is
  invalidated.

## Query

`Query` fetches JSON before the UI renders. It requires a literal `id` and an
app-relative `path`; the result is available at its id.

```xml
<Query id="issues" path="/issues?status=${filters.status}" />
<For each="issues" as="issue"><Text value="${issue.title}" /></For>
```

## For and Visibility

`For` iterates an array. It requires `each` and `as`; its children can read the
item alias and zero-based `index`.

```xml
<For each="issues" as="issue">
  <Text value="${index + 1}. ${issue.title}" if="${issue.open}" />
</For>
```

`if` conditionally renders a node. Do not declare `State` or `Query` inside a
`For`.

## Actions

`Action` wraps a trigger such as `Button`, sends an app-relative `GET`, `POST`,
`PUT`, `PATCH`, or `DELETE` request, then invalidates requested data ids.

```xml
<Action action="/issues/${issue.id}" method="PATCH" json="${{ status: 'closed' }}" invalidate="${['issues']}">
  <Button label="Close" />
</Action>
```

- Use one payload: `json` or `form`. `GET` cannot send a payload.
- `invalidate` accepts `State` and `Query` ids. `closeDialog` closes a
  containing dialog after success.

## Runtime

- Each XML tag maps to an adapter in `adapters/`, registered in `core/registry.tsx`.
- Resolve and validate XML attributes at the adapter boundary, then render the
  matching `@astryxdesign/core-0-3` component.
- Keep declarations and forwarded props ordered by increasing prop-name length,
  following `adapters/Heading.tsx`.
- Preserve Astryx defaults: resolve optional attributes without local defaults
  and pass `undefined` when absent.
- Permit only Astryx-supported serializable props and values.
- Render nested XML only for explicit Astryx child slots. Do not pass arbitrary
  child nodes to components without a matching slot.

## ReactNode Slots

`ReactNode` props are not XML attributes. Expose only an intentional,
serializable XML contract:

- Text-like values use a required string attribute, such as `label="Active"`.
- Named visual slots use nested components with an explicit `slot` attribute:

  ```xml
  <Badge label="Active">
    <Icon slot="icon" icon="check" />
  </Badge>
  ```

- `slot` is XML syntax, consumed by the parent and never forwarded to Astryx.
- Whitelist slot names, allowed child tags, and cardinality.
- Use named slots for multiple `ReactNode` props. Direct children are only for
  one unambiguous child slot.
- Mirror slot names, allowed child elements, and cardinality in the SDK XSD.

## Astryx Alignment

Before editing, inspect the installed matching-version component implementation
and docs:

- `web/node_modules/@astryxdesign/core-<version>/src/<Component>/<Component>.tsx`
- `web/node_modules/@astryxdesign/core-<version>/src/<Component>/<Component>.doc.mjs`

Match supported props, values, defaults, and child slots. Do not expose styles,
events, or other React-only props through XML.

---
name: xml
description: XML runtime adapters, versioning, Astryx alignment, and SDK XSD schemas. Use when changing XML components, props, schemas, or XML validation.
---

Keep improving the XML:

- Make sure that the xml attributes are aligned with `Astryx` components props and types.
- Identify simplifications and refactorings

## Data Model

```xml
<longlink version="0.3">
  <State id="filters" status="open" />
  <Query id="issues" path="/issues?status=${filters.status}" />

  <For each="issues" as="issue">
    <Text value="${issue.title}" />
  </For>

  <Action action="/issues/${issue.id}" method="PATCH" json="${{ status: 'closed' }}" invalidate="${['issues']}">
    <Button label="Close" />
  </Action>

  <Badge label="Active">
    <Icon slot="icon" icon="check" />
  </Badge>
</longlink>
```

- `<State />` creates reactive page-local state. Its literal `id` is the state name, every other attribute is an initial property. Bind controls with `$state.property`. State is recreated when its id is invalidated.
- `<Query />` fetches JSON before the UI renders. It requires a literal `id` and an
  app-relative `path`; the result is available at its id.
- `<For />` iterates an array. It requires `each` and `as`; its children can read the
  item alias and zero-based `index`.
- `<Action />` wraps a trigger such as `Button`, sends an app-relative `GET`, `POST`,
  `PUT`, `PATCH`, or `DELETE` request, then invalidates requested data ids. Use one payload: `json` or `form`. `GET` cannot send a payload.
  `invalidate` accepts `State` and `Query` ids. `closeDialog` closes a containing dialog after success.

- `if` conditionally renders a node.
- `slot` is a named child slot. Used with the props type is `ReactNode`

- Use `${...}` for expressions and interpolation: `"Issue: ${issue.title}"`.
- Read values with paths such as `issue.title`. Use `$state.property` only for
  writable control bindings.
- Expressions support safe values, property access, arrays, objects, arithmetic,
  comparisons, conditions, and selected built-ins. Arbitrary calls are rejected.

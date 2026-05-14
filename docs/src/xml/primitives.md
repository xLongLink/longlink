# Primitives

Primitives define page structure and runtime data.
Use `sdk/longlink/.static/llm/SCHEMA.md` as the authoring reference for valid XML.

## Page

The `Page` root element is required for every XML page.
`name` is required.
`icon` is optional.

```xml
<Page name="Dashboard" icon="layout-grid">
  <p>Dashboard</p>
</Page>
```

## State

The `State` primitive creates a local reactive slot identified by `id`.
`value` must be literal text.

```xml
<State id="user" value="Ada Lovelace" />
```

The runtime stores the value in `state[id]`.
Use the slot from descendant expressions.

## Query

The `Query` primitive fetches JSON and stores the result in `queries[id]`.
`id` and `path` must be literal text.

```xml
<Query id="orders" path="/apps/orders" />
```

The fetched data is available to descendant expressions.

## For

The `For` component renders children for each item in an array.
`each` is the array expression.
`as` names the current item.

```xml
<For each="$orders.items" as="order">
  <p>{order.number}</p>
</For>
```

The current item is available under `as`.
The item index is available as `index`.

## Conditional Rendering

Use `if="..."` on any element to skip rendering when the expression is false.

```xml
<p if="{order.active}">Active</p>
```

## Expressions

Use brace expressions in text nodes and attribute values to read runtime values.

```xml
<p>Hello, {user.name}</p>
```

Use `$name` for direct references.
Use double-brace object payloads for `json` values.

# Primitives

Primitives are the base building blocks of XML pages.
They handle local state, data loading, conditional rendering, and iteration.
Use `sdk/longlink/.static/llm/SCHEMA.md` as the authoring reference for valid XML.

Use them to build dynamic pages without writing frontend code.

## State

`State` defines a local state slot identified by `id`.
Its children render with that state in scope.

```xml
<State id="user" value="{{ username: '', password: '' }}">
  <Input value="user.username" />
  <Input value="user.password" />
</State>
```

Use `{{ ... }}` for JSON or object literals in attribute values.

`value` is required and sets the initial state value.
Use a string, number, or list value depending on the state shape.

## Page

`Page` defines the root page shell.

```xml
<Page name="Dashboard" icon="layout-grid">
  <p>Dashboard</p>
</Page>
```

## Query

`Query` fetches JSON from a path and stores the result in `queries[id]`.
Its children render with the fetched data in scope.

```xml
<Query id="orders" path="/apps/orders" />
```

## If

Use `if` on any element to conditionally render it.

```xml
<p if="{order.active}">Active</p>
```

## For

`For` iterates over an array and exposes each item through `as`.

```xml
<For each="orders" as="order">
  <p>{order.number}</p>
</For>
```

## Expressions

Use `{...}` in text nodes and attribute values to read from `state`, `queries`, or `scope`.

```xml
<p>Hello, {user.name}</p>
```

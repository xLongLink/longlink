# Primitives

Primitives are the base building blocks of XML pages.
They handle local state, data loading, conditional rendering, and iteration.
Use `sdk/longlink/.static/llm/SCHEMA.md` as the authoring reference for valid XML.

Use them to build dynamic pages without writing frontend code.

## State

`State` defines a local state slot identified by `id`.
Its children render with that state in scope.

```xml
<State id="user" username="" password="">
  <Input value="user.username" />
  <Input value="user.password" />
</State>
```

Every non-`id` attribute becomes a named field on the same state object.
That includes `value`, so you can use `user.value`, `user.username`, and `user.password`.

## Page

`Page` defines the root page shell.
`title` overrides the browser title; otherwise LongLink falls back to `name`.

```xml
<Page name="Dashboard" title="Overview">
  <p>Dashboard</p>
</Page>
```

## Query

`Query` fetches JSON from a path and stores the result in `queries[id]`.
Its children render with the fetched data in scope.

Use a full expression for dynamic paths.

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

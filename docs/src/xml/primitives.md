# Primitives

Primitives are the base building blocks of XML pages.
They handle local state, data loading, conditional rendering, and iteration.

Use them to build dynamic pages without writing frontend code.

## State

`State` defines a local state slot identified by `id`.
Its children render with that state in scope.

```xml
<State id="user" username="" password="">
  <Input label="Username" value="$user.username" />
  <Input label="Password" value="$user.password" />
</State>
```

Every non-`id` attribute becomes a named field on the same state object.
That includes `value`, so you can use `user.value`, `user.username`, and `user.password`.

Use `$<prop>` on supported input-like props to sync UI and state.

```xml
<State id="example" value="50" hint="Current progress value.">
  <Input label="Progress" value="$example.value" placeholder="$example.hint" />
</State>
```

`reset` on a `State` element restores its initial value.

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

`reset` on a `Query` element refetches the data.

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

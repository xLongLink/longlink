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

Use `$<prop>` on supported input-like props to sync UI and state.

```xml
<State id="example" value="50" hint="Current progress value.">
  <Input label="Progress" value="$example.value" placeholder="$example.hint" />
  <Slider label="Progress" min="0" max="100" step="5" value="$example.value" />
</State>
```

`reset` on a `State` element restores its initial value.

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
<Card if="{order.active}" />
```

## For

`For` iterates over an array and exposes each item through `as`.

```xml
<For each="orders" as="order">
  <Card>{order.number}</Card>
</For>
```

## Expressions

Use `{...}` in text nodes and attribute values to read from `state`, `queries`, or `scope`.

```xml
<p>Hello, {user.name}</p>
```

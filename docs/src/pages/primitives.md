# Primitives

Primitives are the basic building blocks of XML pages.
They let you manage local state, load data, and control rendering flow.
You can combine them to build dynamic pages without writing frontend code.
The sections below describe each primitive and how it is used.

## State

`State` defines a local, reactive state container. It holds variables that can be bound to components and updated through user interaction or actions.

```xml
<State id="user" username="" password="">
  <Input kind="text" label="Username" bind="user.username" placeholder="Mario Rossi" />
  <Input kind="password" label="Password" bind="user.password" placeholder="password" />
<State />
```

## Query

`Query` declares a data-fetching operation against a REST endpoint. The response is automatically parsed and stored under the given id, making it available for rendering and logic.

```xml
<Query id="orders" path="/apps">
```

## For

`For` iterates over a collection and renders its children for each item. The current element is exposed through the `as` variable.

```xml
<For each="orders" as="order">
  <Card>{order.number}</Card>
</For>
```

## If

All components support an `if` attribute for conditional rendering. The component is rendered only if the expression evaluates to `true`.

```xml
<Card if="order.active" />
```

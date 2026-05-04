# Primitives

Primitives are the basic building blocks of XML pages.
They let you manage local state, load data, and control rendering flow.
You can combine them to build dynamic pages without writing frontend code.
The sections below describe each primitive and how it is used.

## Page

`Page` is the root element of every UI definition. It wraps the full document and sets page metadata such as the name and icon.

```xml
<Page name="Settings" icon="settings">
  <!-- Content -->
</Page>
```

## State

`State` defines local reactive values for an XML page. Bind component props to state paths with `bind:*`.

```xml
<State id="user" username="" password="">
  <Input label="Username" bind:value="user.username" />
  <Input label="Password" bind:value="user.password" />
</State>
```

Bind any supported prop by placing the prop name after `bind:`.

```xml
<State id="example" value="50" hint="Current progress value.">
  <Input label="Progress" bind:value="example.value" bind:placeholder="example.hint" />
  <Slider label="Progress" min="0" max="100" step="5" bind:value="example.value" />
</State>
```

## Query

`Query` declares a data-fetching operation against a REST endpoint. The response is automatically parsed and stored under the given id, making it available for rendering and logic.

Use a full `{...}` expression for dynamic paths.

```xml
<Query id="orders" path="{'/apps'}" />
```

## If

Use `if` for conditional rendering on any element.

```xml
<Card if="{order.active}" />
```

## For

`For` iterates over a collection and renders its children for each item. The current element is exposed through the `as` variable.

```xml
<For each="orders" as="order">
  <Card>{order.number}</Card>
</For>
```

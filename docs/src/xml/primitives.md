# Primitives

Primitives are the basic building blocks of XML pages.
They let you manage local state, load data, and control rendering flow.
You can combine them to build dynamic pages without writing frontend code.
The sections below describe each primitive and how it is used.

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

## Action

Action props define how an XML page submits data back to an endpoint.

Use `action`, `path`, or `url` to name the target. Use `method` to choose the HTTP verb. Use `body` or `payload` to send data. Use `invalidate` to refresh query keys after success. Use `onSuccess` for follow-up work after the request completes.

```xml
<Button
  action="/issues"
  method="POST"
  payload='{"title":"{issue.title}"}'
  invalidate="issues"
>Save</Button>
```

These props are available on action-capable components such as `<Button>`, `<Checkbox>`, `<Input>`, `<Range>`, `<Select>`, `<Slider>`, `<Switch>`, and `<Textarea>`.

`<Input>` and `<Select>` also support `submit` for inline write-back flows.

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

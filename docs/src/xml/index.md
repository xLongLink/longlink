# XML Pages

LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels, dashboards, and internal tools.
Each `.xml` file is the source of truth for layout, bindings, and actions.
The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.

Use `<longlink>` as the root page shell.

```xml
<?xml-model href="https://docs.longlink.dev/schema.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<longlink>
  <P>Hello world</P>
</longlink>
```

## State

Use `<State />` to create a local reactive slot.
Use `id` to name the slot, and seed the state with any additional attributes.
The `value` attribute is just one field on that state object.
Attribute values are parsed as JSON when possible, otherwise they are evaluated as expressions.
`<State>` does not accept children.

```xml
<State id="user" value="name" />
```

```xml
<State id="filters" search="Revenue" page="1" />
```

## if

Use `if` on any supported XML element except `<longlink>` to render conditionally.

```xml
<P if="${order.active}">Active</P>
```

## Query

Use `<Query />` to fetch JSON into a named slot, where the `id` attribute to name the query slot and the `path` attribute to point at the JSON endpoint or absolute URL.
`<Query>` does not accept children.

```xml
<Query id="products" path="/api/products" />
```

## Action

Use `<Action />` to submit a request from an XML page.
Use `action` to set the target endpoint.
Use `method` to set the HTTP method when needed.
`<Action>` can include content as its label.

```xml
<Action action="/issues" json='${{ title: issue.title }}'>
  Save issue
</Action>
```

## Expressions

Use `${count}` for wrapped expressions that return typed values.

```xml
<P>Current products, ${products.total}</P>
```

## References

Use `$name` for direct references.

```xml
<Input value="$user">
```

## For

Use `For` to render one child scope for each item in an array.

```xml
<For each="${products.items}" as="product">
  <P>${product.name}</P>
</For>
```

# XML Pages

LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels, dashboards, and internal tools.
Each `.xml` file is the source of truth for layout, bindings, and actions.
The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.

Use `<longlink>` as the root page shell.

```xml
<?xml-model href="https://docs.longlink.dev/schema.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<longlink>
  <p>Hello world</p>
</longlink>
```

## State

Use `<State />` to create a local reactive slot, where the `id` attribute to name and `value` to seed the initial state.

```xml
<State id="user" value="name" />
```

## Query

Use `<Query />` to fetch JSON into a named slot, where the `id` attribute to name the query slot and the `path` attribute to point at the JSON endpoint or absolute URL.

```xml
<Query id="products" path="/api/products" />
```

## Expressions

Use `${count}` for wrapped expressions that return typed values.

```xml
<p>Current products, ${products.total}</p>
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
  <p>${product.name}</p>
</For>
```

## if

Use `if` on any supported XML element to render the element only when the expression is truthy.

```xml
<p if="${order.active}">Active</p>
```

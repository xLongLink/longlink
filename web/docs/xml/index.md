---
lastUpdated: 2026-05-26
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/xml/index.md
---

# XML Pages

LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels, dashboards, and
internal tools. Each `.xml` file is the source of truth for layout, bindings, and actions.

The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.

Use `<longlink>` as the root page shell.

```xml
<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: ${filter.value}</FieldDescription>
</Field>
```

## if

Use `if` on any supported XML element except `<longlink>` to render conditionally.

```xml
<State id="filter" value='""' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription if="${filter.value in ['if']}">Shown only when the filter is if.</FieldDescription>
</Field>
```

## Query

Use `<Query />` to fetch JSON into a named slot, where the `id` attribute names the query slot and the `path`
attribute points at the JSON endpoint or absolute URL. `<Query>` does not accept children.

```xml
<Query id="products" path="/api/products" />
```

## Action

Use `<Action />` to submit a request from an XML page. Use `action` to set the target endpoint. Use `method` to set
the HTTP method when needed. `<Action>` can include content as its label.

```xml
<Action action="/issues" method="POST">Save issue</Action>
```

## Expressions

Use `${count}` for wrapped expressions that return typed values.

```xml
<P>Current products, ${products.total}</P>
```

## State

Use `<State />` to seed shared runtime values for sibling content, references, and loops.

```xml
<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: ${filter.value}</FieldDescription>
</Field>
```

## References

Use `$name` for direct references to a state value.

```xml
<State id="selectedProduct" name="Alpha" status="Active" />
<P>Selected product: $selectedProduct.name (${selectedProduct.status})</P>
```

## For

Use `For` to render one child scope for each item in an array state or query result.

```xml
<State id="items" value='["Alpha", "Beta"]' />
<Ul>
    <For each="${items.value}" as="item">
        <Li>${item}</Li>
    </For>
</Ul>
```

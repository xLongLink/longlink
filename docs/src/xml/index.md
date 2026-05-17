# XML Pages

LongLink XML pages define the user interface for backoffice applications, admin panels, and internal tools.
The runtime parses each `.xml` file, resolves expressions, and renders the supported tags as React components.

Use XML pages for CRUD screens, forms, tables, dashboards, and operational workflows.

## Page Loading

```python
from longlink import LongLink

app = LongLink(env=env)
app.include_page("/pages")
```

Pages are loaded from nested `*.xml` files under the registered folder.
For example, `pages/dashboard/overview.xml` is available at `/pages/dashboard/overview.xml`.

## Root Element

Every page starts with the `Page` root element.
It defines the page shell and page metadata.

```xml
<Page name="Tab Name" icon="settings">
  <p>Hello</p>
</Page>
```

## Primitives

Use the `Page`, `State`, `Query`, and `For` primitives to build interactive pages.
Use `sdk/longlink/.static/llm/SCHEMA.md` as the authoring reference for valid XML.

### `Page`

The `Page` root element is required for every XML page.
`name` is required.
`icon` is optional.

```xml
<Page name="Dashboard" icon="layout-grid">
  <p>Dashboard</p>
</Page>
```

### `State`

The `State` primitive creates a local reactive slot identified by `id`.
`value` must be literal text.

```xml
<State id="user" value="Ada Lovelace" />
```

The runtime stores the value in `ctx.values[id]`.
Use the slot from descendant expressions.

### `Query`

The `Query` primitive fetches JSON and stores the result in `ctx.values[id]`.
`id` and `path` must be literal text.

```xml
<Query id="orders" path="/apps/orders" />
```

The fetched data is available to descendant expressions.

### `For`

The `For` component renders children for each item in an array.
`each` is the array expression.
`as` names the current item.

```xml
<For each="$orders.items" as="order">
  <p>{order.number}</p>
</For>
```

The current item is available under `as`.
The item index is available as `index`.

## Components

Use the component layer for layout and interactive controls.

### `Hero`

The `Hero` component renders a page header shell.
It accepts an optional `icon` attribute.

```xml
<Hero icon="layout-grid">
  <HeroTitle>Organizations</HeroTitle>
  <HeroDescription>Browse the organizations you belong to.</HeroDescription>
  <HeroContent>
    <Button action="/organizations/new">Create organization</Button>
  </HeroContent>
</Hero>
```

### `HeroTitle`

Use `HeroTitle` for the hero heading.

### `HeroDescription`

Use `HeroDescription` for supporting hero copy.

### `HeroContent`

Use `HeroContent` for hero actions or supplemental content.

### Conditional Rendering

Use `if="..."` on any element to skip rendering when the expression is false.

```xml
<p if="{order.active}">Active</p>
```

### Expressions

Use brace expressions in text nodes and attribute values to read runtime values.

```xml
<p>Hello, {user.name}</p>
```

Use `$name` for direct references.
Use double-brace object payloads for `json` values.

Use only the elements and attributes documented in this page and in `sdk/longlink/.static/llm/SCHEMA.md`.

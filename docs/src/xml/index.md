# XML Pages

LongLink XML pages define the user interface for backoffice applications, admin panels, and internal tools.
The runtime parses each `.xml` file, resolves expressions, and renders the supported tags as React components.

Use XML pages for CRUD screens, forms, tables, dashboards, and operational workflows.

## Page Loading

```python
from longlink import LongLink, page

app = LongLink(env=env)


@page("/pages/dashboard/overview.xml", icon="layout-grid")
def dashboard_page():
    return None
```

Pages are declared directly with the `page` decorator.
The `url` points at the XML page path and `icon` is optional.

## Root Element

Every page starts with the `Page` root element.
It defines the page shell and page metadata.

```xml
<Page>
  <p>Hello</p>
</Page>
```

## Primitives

Use the `Page`, `State`, `Query`, and `For` primitives to build interactive pages.
Use `sdk/longlink/.static/llm/SCHEMA.md` as the authoring reference for valid XML.

### `Page`

The `Page` root element is required for every XML page.
`name` is optional and falls back to the filename in SDK metadata.
The current web renderer uses `children` and does not read `name`.

```xml
<Page>
  <p>Dashboard</p>
</Page>
```

### `State`

The `State` primitive creates a local reactive slot identified by `id`.
`value` is evaluated as an expression.

```xml
<State id="cart" value="{[]}" />
```

The runtime stores the value in `ctx.values[id]`.
Scalar values become a proxied object with a `value` field.
Array and object values become proxied values directly.
Use the slot from descendant expressions.

### `Query`

The `Query` primitive fetches JSON and stores the result in `ctx.values[id]`.
`id` and `path` must be literal text, not expressions.

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
If `each` does not resolve to an array, nothing renders.

## Components

Use the component layer for layout and interactive controls like `Hero`, `Card`, `Dialog`, `Tabs`, `Button`, `Input`, `Badge`, and `Divider`.

### `Hero`

The `Hero` component renders a page header shell.
It accepts an optional `icon` attribute.
`HeroContent` renders in a separate slot on the right.
All other children render in the main hero body.

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

### `Card`

The `Card` component renders a grouped content shell.
Use `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` to compose the shadcn layout.
Use `size="sm"` for the compact shadcn variant.
Each card part also accepts `className` for local styling.

### `Dialog`

The `Dialog` component renders a modal shell.
Use `DialogTrigger` to open it and `DialogContent` for the modal body.
Use `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter` inside the content area.
`open` controls the visible state, and `defaultOpen` can be used for an initially open dialog.

### `Tabs`

The `Tabs` component renders a shadcn tab shell.
Use `TabsList` for the tab bar, `TabsTrigger` for each tab, and `TabsContent` for each panel.
`TabsTrigger` and `TabsContent` require matching `value` attributes.
`TabsList` supports `variant`, and all tabs parts accept `className`.

### Conditional Rendering

Use `if="..."` on any documented XML element to skip rendering when the expression is false.

```xml
<p if="{order.active}">Active</p>
```

### Expressions

Use brace expressions in text nodes and attribute values to read runtime values.

```xml
<p>Hello, {user.name}</p>
```

Use `$name` for direct references.
Use `{count + 1}` for wrapped expressions that return typed values.
Use `{{ fullName: fullName }}` for object payloads in `json` attributes.
Use mixed text interpolation like `Hello {name}` when plain text and runtime values need to share a string.

Supported expressions are literals, dotted lookups, arrays, objects, template literals, and basic arithmetic.
Unsupported expressions include statements, function calls, assignments, comparisons, logical operators, ternaries, optional chaining, and globals.

Use only the elements and attributes documented in this page and in `sdk/longlink/.static/llm/SCHEMA.md`.

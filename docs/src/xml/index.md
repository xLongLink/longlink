# XML Pages

LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels, dashboards, and internal tools.
Each `.xml` file is the source of truth for layout, bindings, and actions.
The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.

## Introduction

Use XML pages when you need a predictable, declarative UI model for operational software.
The XML layer is optimized for forms, tables, dashboards, and other repeatable workflows where consistency matters more than custom UI logic.

Every page starts with a `<longlink>` root element.
Use `if="..."` on supported elements to conditionally render content.

## `longlink`

Use `longlink` as the root page shell.

```xml
<longlink>
  <p>Hello world</p>
</longlink>
```

Put the full page body inside `longlink`.
The root element owns the rendered page structure.

## `State`

Use `State` to create a local reactive slot.

```xml
<State id="cart" value="[]" />
```

Use `id` to name the state slot.
Use `value` to seed the initial state.
`value` is evaluated as an expression.

## `Query`

Use `Query` to fetch JSON into a named slot.

```xml
<Query id="products" path="/api/products" />
```

Use the `id` attribute to name the query slot.
Use the `path` attribute to point at the JSON endpoint.
Both attributes must be literal text.

## `For`

Use `For` to render one child scope for each item in an array.

```xml
<For each="products.items" as="product">
  <p>{product.name}</p>
</For>
```

Use `each` to select the array.
Use `as` to name the current item in the child scope.
The `each` expression must resolve to an array.

## `if`

Use `if` on any supported XML element to render the element only when the expression is truthy.

```xml
<p if="{order.active}">Active</p>
```

## `Expressions`

Use expressions in text nodes and attribute values to read runtime state.

```xml
<p>Hello, {user.name}</p>
```

Use `$name` for direct references.
Use `{count + 1}` for wrapped expressions that return typed values.
Use `&#123;&#123; fullName: fullName &#125;&#125;` for object payloads in `json` attributes.
Use mixed text interpolation like `Hello {name}` when plain text and runtime values need to share a string.

Supported expressions are literals, dotted lookups, arrays, objects, template literals, and basic arithmetic.
Unsupported expressions include statements, function calls, assignments, comparisons, logical operators, ternaries, optional chaining, and globals.

See `components.md` for the React-backed component surface.
See `html.md` for the lowercase HTML bridge elements.
See `sdk/longlink/.static/llm/SCHEMA.md` for the XML authoring reference.

# LongLink XML Schema

This document is the human-readable source of truth for LongLink XML pages.
Use it to author valid XML without reading the SDK code.
If this document and implementation differ, update this document first and then align the code.

## Core Rules

- Every page starts with a `<Page>` root element.
- Element names are case-sensitive.
- XML attributes map to component props.
- Curly-brace expressions are evaluated against runtime state and scope.
- Unknown attributes may pass XSD validation, but only documented attributes are supported by LongLink.
- A valid page must use only the elements and attributes described here.
- Do not rely on SDK code, samples, or docs outside this file for XML authoring rules.

## Expression Model

LongLink evaluates JavaScript-like expressions inside `{...}`.

### Implemented

- Expressions can read from runtime state and lexical scope.
- Expressions may appear in attribute values and text nodes.
- Strings wrapped in `{...}` can resolve to non-string values.
- Nested objects and arrays in `json` values are resolved recursively.
- Scope is lexical: child elements read from their nearest parent scope first, then walk outward.

### TODO

- Single-expression-only validation still needs to be enforced everywhere.
- Control flow statements, function definitions, and side-effectful operations still need to be rejected.
- Side-effect-free validation for calls, updates, and mutation operators still needs implementation.
- Declarative mutation syntax in `mutate=""` still needs schema support.
- Automatic loop ID scoping and `$id.name` references still need implementation.
- Function expressions, arrow functions, and global object access still need to be blocked.
- Restricting expressions to state, loop variables, query results, and computed values still needs enforcement.
- Network request expressions through `<Query />`, button attributes, and `submit="..."` still need finalization.
- Serializable payload validation and `{{...}}` object-literal payload handling still need implementation.
- Expression size limits and static analysis support still need implementation.

## Global XML Patterns

### Conditional Rendering

Any documented XML element may use `if="condition"`.

If the expression is false, the element is not rendered.

### Reusable State Slots

`<State>` and `<Query>` both create a slot identified by `id`.

- `<State id="user" value="John Doe" />` creates local state.
- `<Query id="user" path="/endpoint" />` fetches data into the slot.

### Iteration

`<For>` loops over an array.

```xml
<For each="orders" as="order">
  <p>{order.title}</p>
</For>
```

## Root Element

### `<Page>`

Defines the page root.

Attributes:

- `name` required. Page name.
- `icon` optional. Icon name for page metadata.

Children:

- Any documented XML element.

Example: `<Page name="Dashboard" icon="layout-grid"><p>Dashboard</p></Page>`

## Primitives

### `<State>`

Declares local reactive state.

Attributes:

- `id` required. State key.
- `value` required. Initial state value.

Behavior:

- The state is exposed as `ctx.values[id]`.
- The value is a `[currentValue, setter]` tuple internally.

### `<Query>`

Fetches JSON data and stores it in query state.

Attributes:

- `id` required. Query key.
- `path` required. Request path or absolute URL.

Behavior:

- Fetched data is exposed as `ctx.values[id]`.
- Descendants can read it through expressions.

## Hero

### `<Hero>`

Renders a page header shell.

Attributes:

- `icon` optional. Hero icon name.

Children:

- Any documented XML element.

Example: `<Hero icon="layout-grid"><HeroTitle>Organizations</HeroTitle></Hero>`

### `<HeroTitle>`

Hero title slot.

### `<HeroDescription>`

Hero description slot.

### `<HeroContent>`

Hero action/content slot.

### `<For>`

Renders children for each item in a list.

Attributes:

- `each` required. Expression resolving to an array.
- `as` required. Scope variable name for the current item.

Behavior:

- Each item is rendered in a child scope.
- The current item is exposed as the `as` name.
- The item index is exposed as `index`.

## Layout

### `<Divider>`

Renders a simple horizontal separator.

Attributes:

- none.

Behavior:

- Outputs a visual divider between sections.

Example: `<Divider />`

## Form Controls

### `<Button>`

Actionable button.

Attributes:

- `action` optional. API path to call.
- `method` optional. HTTP method. Defaults to `POST`.
- `json` optional. Request body value or JSON string.
- `invalidate` optional. Array expression of slot ids to rerun.

Behavior:

- Performs the configured action request.
- `invalidate` refetches the named query slots after the request succeeds.

Example: `<Button action="/issues" json='{{ title: issue.title }}'>Save</Button>`

### `<Input>`

Single-line text input.

Attributes:

- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `type` optional. Input type.

Behavior:

- Renders a plain text input.
- When `value` resolves to a reactive state slot, changes write back to `state.value`.
- Otherwise, the field uses `value` as its initial text.

Example:

```xml
<Input value="user.name" placeholder="Your name" />
```

## Tables

## HTML Bridge

The following HTML tags are exposed directly in XML:

- `<p>`

## Summary

If an element, attribute, or variant is not listed here, do not rely on it for page authoring.

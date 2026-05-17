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

### Limits

- Use expressions for values, lookups, array literals, object literals, template literals, and basic arithmetic.
- Do not rely on statements, function calls, assignments, comparisons, logical operators, ternaries, optional chaining, or globals.

## Global XML Patterns

### Conditional Rendering

Any documented XML element may use `if="condition"`.

If the expression is false, the element is not rendered.

### Reusable State Slots

`<State>` and `<Query>` both create a slot identified by `id`.

- `<State id="user" value="John Doe" />` creates local state.
- `<State id="cart" value="{[]}" />` creates an array state slot.
- `value` is evaluated as an expression against runtime state.
- `<Query id="user" path="/endpoint" />` fetches data into the slot. `id` and `path` must be literal text.

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

Behavior:

- The web renderer uses `children` and does not read `name` today.

Example: `<Page name="Dashboard" icon="layout-grid"><p>Dashboard</p></Page>`

## Primitives

### `<State>`

Declares local reactive state.

Attributes:

- `id` required. State key.
- `value` required. Initial state value. Must be literal text.

Behavior:

- The state is exposed as `ctx.values[id]`.
- Scalar values are stored as a proxied object with a `value` property.
- Array values are stored as proxied arrays.

### `<Query>`

Fetches JSON data and stores it in query state.

Attributes:

- `id` required. Query key.
- `path` required. Request path or absolute URL. Must be literal text.

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

Behavior:

- `HeroContent` is rendered in a separate slot on the right.
- All other children render in the main hero body.

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
- If `each` does not resolve to an array, nothing renders.

## Badge

### `<Badge>`

Renders a compact status label.

Attributes:

- `variant` optional. Badge style variant.

Behavior:

- Renders inline content using the shared badge shell.
- Supports the global `if` attribute.

Example: `<Badge variant="secondary">New</Badge>`

## Card

### `<Card>`

Renders a grouped content shell.

Attributes:

- `size` optional. Card density variant.

Behavior:

- Renders content using the shared shadcn card base.
- Supports the global `if` attribute.
- Use `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` inside `Card`.
- All card parts accept optional `className` for local styling.

Example: `<Card><CardHeader><CardTitle>Card Title</CardTitle></CardHeader><CardContent><p>Card Content</p></CardContent></Card>`

### `<CardHeader>`

Header slot for the card.

### `<CardTitle>`

Title slot for the card header.

### `<CardDescription>`

Description slot for the card header.

### `<CardAction>`

Action slot for the card header.

### `<CardContent>`

Body content slot for the card.

### `<CardFooter>`

Footer slot for the card.

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

- `action` optional. Target path to call or navigate to.
- `method` optional. HTTP method. `GET` navigates to `action`; `POST`, `PUT`, and `DELETE` send a request. Defaults to `POST`.
- `json` optional. Request body value or JSON string.
- `invalidate` optional. Array expression of slot ids to rerun.

Behavior:

- If `action` is empty, the button only reruns invalidation targets.
- If `method` is `GET`, the button renders as a link to `action`.
- If `method` is `POST`, `PUT`, or `DELETE`, the button sends the configured action request.
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
- When `value` resolves to a reactive Valtio-backed state slot, changes write back to `state.value`.
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

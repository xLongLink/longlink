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

Rules:

- Expressions can read from runtime state and lexical scope.
- Expressions may appear in attribute values and text nodes.
- Strings wrapped in `{...}` can resolve to non-string values.
- Nested objects and arrays in payloads are resolved recursively.
- Scope is lexical: child elements read from their nearest parent scope first, then walk outward.

## Global XML Patterns

### Conditional Rendering

Any element may use `if="condition"`.

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
- `title` optional. Explicit document title. Falls back to `name` when omitted.
- `icon` optional. Icon name for page metadata.

Children:

- Any documented XML element.

Example: `<Page name="Dashboard" icon="layout-grid"><p>Dashboard</p></Page>`

## Primitives

### `<State>`

Declares local reactive state.

Attributes:

- `id` required. State key.
- `value` and any other attributes become named fields on the state object.

Behavior:

- The state is exposed as `state[id]`.
- Each attribute is readable as `state[id].<attributeName>`.
- The value is a `[currentValue, setter]` tuple internally.

### `<Text>`

Renders evaluated text content.

Attributes:

- `text` optional. Preferred text expression.
- `value` optional. Alias for `text`.

Behavior:

- Resolves the expression against runtime state.
- Returns plain text, number, or boolean output.

### `<Query>`

Fetches JSON data and stores it in query state.

Attributes:

- `id` required. Query key.
- `path` required. Request path or absolute URL.

Behavior:

- Fetched data is exposed as `queries[id]`.
- Descendants can read it through expressions.

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

## Form Controls

### `<Button>`

Actionable button.

Attributes:

- `action` optional. API path to call.
- `method` optional. HTTP method. Default `POST`.
- `payload` optional. Request body value or JSON string.
- `invalidate` optional. Comma-separated query keys.
  Behavior:

- Performs the configured action request.
- `invalidate` refetches the named query slots after the request succeeds.

Example: `<Button action="/issues" method="POST" payload='{"title":"{issue.title}"}' invalidate="issues">Save</Button>`

### `<Input>`

Single-line text input.

Attributes:

- `value` optional. Expression for the displayed text.
- `placeholder` optional.

Behavior:

- Renders a plain text input.
- The field is read-only and reflects the evaluated `value`.

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

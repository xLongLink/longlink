# LongLink XML Schema

This document is the human-readable source of truth for LongLink XML pages.
Use it to author valid XML without reading the SDK code.

## Core Rules

- Every page starts with a `<Page>` root element.
- Element names are case-sensitive.
- XML attributes map to component props.
- Curly-brace expressions are evaluated against runtime state and scope.
- Unknown attributes are allowed by the XSD, but only documented attributes are guaranteed.
- A valid page must use only the elements and attributes described here.

## Expression Model

LongLink evaluates JavaScript-like expressions inside `{...}`.

Rules:

- Expressions can read from `state`, `queries`, and `scope`.
- Expressions may appear in attribute values and text nodes.
- Strings wrapped in `{...}` can resolve to non-string values.
- Nested objects and arrays in payloads are resolved recursively.

## Global XML Patterns

### Conditional Rendering

Any element may use `if="condition"`.

If the expression is false, the element is not rendered.

### Two-way Binding

Any supported input-like component may bind a prop by setting its value to a `$` state path.

For common controlled props like `value`, `checked`, and `active`, LongLink
passes the current prop value and wires a normal `onChange` handler back to
state. Other bound props use a matching `on<Prop>Change` callback when the
component supports it.

Use `$` binding for all two-way state wiring.

Example:

```xml
<Input value="$user.name" />
```

### Reusable State Slots

`<State>` and `<Query>` both create a slot identified by `id`.

- `<State id="user" value="John Doe" />` creates local state.
- `<Query id="user" path="/endpoint" />` fetches data into the slot.

### Reset and Refetch

- `reset` on `<State>` restores the initial value.
- `reset` on `<Query>` triggers a refetch.

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
- Any other attributes become the initial state object.

Behavior:

- The state is exposed as `state[id]`.
- The value is a `[currentValue, setter]` tuple internally.

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

## Layout

## Content Components

### `<Icon>`

Loads a Lucide icon by name.

Attributes:

- `name` required. Lucide icon name.
- `fallback` optional. Default `box`.

## Form Controls

### `<Button>`

Actionable button or link.

Attributes:

- `action` optional. API path to call.
- `method` optional. HTTP method. Default `POST`.
- `payload` optional. Request body value or JSON string.
- `invalidate` optional. Comma-separated query keys or an array.
- `disabled` optional.
- `variant` optional.
- `size` optional.

Button variants:

- `default`
- `outline`
- `secondary`
- `ghost`
- `destructive`
- `link`

Button sizes:

- `default`
- `xs`
- `sm`
- `lg`
- `icon`
- `icon-xs`
- `icon-sm`
- `icon-lg`

Behavior:

- Performs the configured action request.

Example: `<Button action="/issues" method="POST" payload='{"title":"{issue.title}"}' invalidate="issues">Save</Button>`

### `<Input>`

Input field with optional label and description.

Attributes:

- `name` optional.
- `kind` optional. One of `text`, `number`, `password`, `textarea`, `date`, `datetime`.
- `label` optional.
- `value` optional.
- `placeholder` optional.
- `description` optional.
- `required` optional.
- `disabled` optional.

## Tables

## HTML Bridge

The following HTML tags are exposed directly in XML:

- `<p>`

## Summary

If an element, attribute, or variant is not listed here, do not rely on it for page authoring.

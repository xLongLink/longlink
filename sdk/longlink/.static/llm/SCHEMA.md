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

Example: `<Page name="Dashboard" icon="layout-grid"><Hero title="Dashboard" /></Page>`

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

### `<Grid>`

CSS grid container.

Attributes:

- `gap` optional. CSS gap value. Default `1rem`.
- `columns` optional. `grid-template-columns` value.
- `align` optional. `align-items` value.
- `justify` optional. `justify-items` value.
- `style` optional. Inline style object string.

### `<Stack>`

Flexible stack container.

Attributes:

- `direction` optional. `column` or `row`. Default `column`.
- `gap` optional. Number or CSS length. Default `16`.
- `align` optional. `start`, `center`, `end`, or `stretch`. Default `stretch`.
- `justify` optional. `start`, `center`, `end`, or `between`. Default `start`.

### `<Columns>`

Responsive multi-column layout.

Attributes:

- `gap` optional. Number or CSS length. Default `16`.
- `widths` optional. Array of column weights.

### `<Column>`

Child of `<Columns>`.

Attributes:

- `span` optional. Column span from 1 to 12.
- `width` optional. Alias for `span`.

### `<Dialog>` family

Dialog elements are structural wrappers around the UI dialog component.

Elements:

- `<Dialog>`
- `<DialogTrigger>`
- `<DialogContent>`
- `<DialogHeader>`
- `<DialogTitle>`
- `<DialogDescription>`
- `<DialogFooter>`

### `<Tabs>` family

Tabs elements are structural wrappers around the UI tabs component.

Elements:

- `<Tabs>`
- `<TabsList>`
- `<TabsTrigger>`
- `<TabsContent>`

## Content Components

### `<Hero>`

Page header block.

Attributes:

- `title` required.
- `subtitle` optional.
- `icon` optional.

### `<Card>` family

Card layout wrappers.

Elements:

- `<Card>`
- `<CardHeader>`
- `<CardTitle>`
- `<CardDescription>`
- `<CardContent>`
- `<CardFooter>`
- `<CardAction>`

### `<Menu>` family

Menu navigation container.

Elements:

- `<Menu>`
- `<MenuSection title="..." icon="...">`
- `<MenuSubSection title="..." root="true|false">`

Attributes:

- `MenuSection.title` required.
- `MenuSection.icon` optional Lucide icon name.
- `MenuSubSection.title` optional.
- `MenuSubSection.root` optional boolean string.

Behavior:

- A section may contain one root subsection and any number of normal subsections.
- The first section becomes active by default.

### `<Separator>`

Horizontal separator line.

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

### `<Select>`

Dropdown select.

Attributes:

- `name` optional.
- `label` optional.
- `value` optional.
- `placeholder` optional.
- `description` optional.
- `options` optional. Array of `{ label, value }` objects or a JSON string.
- `required` optional.
- `disabled` optional.

### `<Checkbox>`

Checkbox with label and description.

Attributes:

- `label` optional.
- `description` optional.
- `checked` optional. Boolean or boolean string.

### `<Switch>`

Toggle switch with label and description.

Attributes:

- `label` optional.
- `description` optional.
- `active` optional. Boolean or boolean string.
- `checked` optional. Boolean or boolean string.

### `<Slider>`

Single-value slider or range-like slider.

Attributes:

- `label` optional.
- `description` optional.
- `min` optional. Default `0`.
- `max` optional. Default `100`.
- `step` optional. Default `1`.
- `value` optional. Number, array of numbers, or JSON string.
- `orientation` optional. `horizontal` or `vertical`.
- `disabled` optional.

### `<Range>`

Two-handle range slider.

Attributes:

- `label` optional.
- `description` optional.
- `min` optional. Default `0`.
- `max` optional. Default `100`.
- `step` optional. Default `1`.
- `value` optional. Two-number array or JSON string.

### `<Textarea>`

Multiline input.

Attributes:

- `label` optional.
- `description` optional.

## Tables

### `<Table>` family

Table wrappers.

Elements:

- `<Table>`
- `<TableHead>`
- `<TableHeader>`
- `<TableBody>`
- `<TableRow>`
- `<TableCell>`

## HTML Bridge

The following HTML tags are exposed directly in XML:

- `<h1>`
- `<h2>`
- `<h3>`
- `<h4>`
- `<p>`
- `<blockquote>`
- `<ul>`
- `<li>`

## Summary

If an element, attribute, or variant is not listed here, do not rely on it for page authoring.

# LongLink XML Schema

This document is the human-readable source of truth for LongLink XML pages.
Use it to author valid XML without reading the SDK code.
If this document and implementation differ, update this document first and then align the code.

## Core Rules

- Every document starts with a `<longlink>` root element.
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

- Use expressions for literal text, dotted lookups, wrapped values, array literals, object literals, template literals, basic arithmetic, and mixed text interpolation.
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

### `<longlink>`

Defines the root shell.

Attributes:

- None.

Children:

- Any documented XML element.

Behavior:

- SDK metadata exposes page paths directly.

Example: `<longlink><p>Dashboard</p></longlink>`

## Primitives

### `<State>`

Declares local reactive state.

Attributes:

- `id` required. State key.
- `value` required. Initial state value. Evaluated as an expression.

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

The `icon` value uses the same Lucide icon names supported by `<Icon>`.

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

### `<Icon>`

Renders a Lucide icon.

Attributes:

- `name` required. Lucide icon name such as `layout-grid`.
- `className` optional. Extra SVG classes for sizing and styling.

Behavior:

- Renders as an inline SVG icon.
- Supports the global `if` attribute.

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

## Columns

### `<Columns>`

Renders a full-width column row.

Attributes:

- `className` optional. Extra layout classes.

Behavior:

- Use `Column` children inside `Columns`.
- Columns span the full available width.
- `Column.width` controls the percentage share of the row.

Example:

```xml
<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>
```

### `<Column>`

Renders one percentage-based column.

Attributes:

- `width` required. Percentage of the row, such as `70`.
- `className` optional. Extra layout classes.

Behavior:

- `Column` content renders inside its own width box.

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

## Table

### `<Table>`

Renders a scrollable shadcn table shell.

Attributes:

- `className` optional. Extra classes for the table element.

Behavior:

- Renders inside a horizontal scroll container.
- Use `TableCaption`, `TableHeader`, `TableBody`, and `TableFooter` inside `Table`.
- Use `TableRow` inside header, body, and footer sections.
- Use `TableHead` for header cells and `TableCell` for body cells.
- All table parts accept optional `className` for local styling.

Example:

```xml
<Table>
  <TableCaption>Revenue by quarter</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Quarter</TableHead>
      <TableHead>Revenue</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Q1</TableCell>
      <TableCell>$120k</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### `<TableHeader>`

Header section for table columns.

### `<TableBody>`

Body section for table rows.

### `<TableFooter>`

Footer section for summary rows.

### `<TableRow>`

Table row slot.

### `<TableHead>`

Header cell slot.

### `<TableCell>`

Body cell slot.

### `<TableCaption>`

Caption slot for the table.

## Dialog

### `<Dialog>`

Renders a modal shell.

Attributes:

- `open` optional. Control whether the dialog is currently open.
- `defaultOpen` optional. Open the dialog on first render.

Behavior:

- Use `DialogTrigger` to open the dialog.
- Use `DialogContent` for the modal body.
- Use `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter` inside the content area.
- `DialogContent` renders in a portal and includes the standard close affordance.

Example:

```xml
<Dialog open="{true}">
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete issue</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### `<DialogTrigger>`

Opens the dialog.

### `<DialogContent>`

Dialog body surface.

### `<DialogHeader>`

Header slot for the dialog body.

### `<DialogTitle>`

Title slot for the dialog header.

### `<DialogDescription>`

Description slot for the dialog header.

### `<DialogFooter>`

Footer slot for dialog actions.

## Layout

### `<Divider>`

Renders a simple horizontal separator.

Attributes:

- none.

Behavior:

- Outputs a visual divider between sections.

Example: `<Divider />`

### `<Tabs>`

Renders a shadcn-backed tab shell.

Attributes:

- `defaultValue` optional. Initial active tab value.
- `orientation` optional. Tabs orientation.
- `className` optional. Root class override.

Children:

- `TabsList`
- `TabsContent`

Behavior:

- `TabsList` contains `TabsTrigger` items.
- Each `TabsTrigger` and `TabsContent` requires a `value` attribute.
- Use `TabsContent` panels with matching `value` keys.
- Only the active `TabsContent` is rendered.

Example:

```xml
<Tabs defaultValue="overview">
  <TabsList variant="line">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview panel</TabsContent>
  <TabsContent value="settings">Settings panel</TabsContent>
</Tabs>
```

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
- If `json` is omitted, the request is sent without a JSON body.
- `invalidate` refetches the named query slots after the request succeeds.

Example: `<Button action="/issues" json='{{ title: issue.title }}'>Save</Button>`

### `<Label>`

Form label for controls.

Attributes:

- `className` optional. Extra classes for styling.
- `htmlFor` optional. Target control id.

Behavior:

- Renders as a normal HTML label.
- Supports the global `if` attribute.

### `<Checkbox>`

Binary toggle control.

Attributes:

- `checked` optional. Reactive state slot or current checked value.
- `defaultChecked` optional. Initial checked state.
- `className` optional. Extra classes for styling.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.

Behavior:

- When `checked` resolves to a Valtio-backed state slot, toggle updates write back to `state.value`.
- Otherwise, `defaultChecked` sets the initial checked state.
- Supports the global `if` attribute.

### `<Switch>`

Binary switch control.

Attributes:

- `checked` optional. Reactive state slot or current checked value.
- `defaultChecked` optional. Initial checked state.
- `className` optional. Extra classes for styling.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `size` optional. Switch size variant. Use `sm` or `default`.

Behavior:

- When `checked` resolves to a Valtio-backed state slot, toggle updates write back to `state.value`.
- Otherwise, `defaultChecked` sets the initial checked state.
- Supports the global `if` attribute.

### `<Input>`

Single-line text input.

Attributes:

- `label` optional. Fallback placeholder text.
- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `type` optional. Input type.

Behavior:

- Renders a plain text input.
- When `value` resolves to a reactive Valtio-backed state slot, changes write back to `state.value`.
- Otherwise, the field uses `value` as its initial text.

Example:

```xml
<Input label="Your name" value="user.name" />
```

### `<Select>`

Use `Select` with `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, and `SelectSeparator` for single-choice menus.

Attributes:

- `defaultValue` optional. Initial selected value.
- `value` optional. Reactive state slot or current selection.
- `open` optional. Control whether the menu is open.
- `defaultOpen` optional. Open the menu on first render.

Behavior:

- `SelectTrigger` contains `SelectValue`.
- `SelectContent` renders grouped menu items in a portal.
- `SelectGroup` contains `SelectLabel`, `SelectItem`, and `SelectSeparator`.
- `SelectItem` requires a `value` attribute.
- `className` is available on the trigger, value, content, group, label, item, and separator slots.

Example:

```xml
<Select defaultValue="overview">
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Views</SelectLabel>
      <SelectItem value="overview">Overview</SelectItem>
      <SelectItem value="settings">Settings</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Status</SelectLabel>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="archived">Archived</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

### `<SelectTrigger>`

Opens the select menu.

### `<SelectValue>`

Displays the current value or placeholder.

### `<SelectContent>`

Menu surface for select options.

### `<SelectGroup>`

Groups related select options.

### `<SelectLabel>`

Label slot for a grouped section.

### `<SelectItem>`

Selectable menu item.

### `<SelectSeparator>`

Visual separator between groups.

## HTML Bridge

The following HTML tags are exposed directly in XML:

- `<p>`
- `<a>`

### `<p>`

Renders a paragraph element.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders as a normal HTML paragraph.
- Supports the global `if` attribute.

### `<a>`

Renders a standard anchor link.

Attributes:

- `href` required. Link target.
- `className` optional. Extra classes for styling.

Behavior:

- Renders as a normal HTML anchor.
- Supports the global `if` attribute.

## Summary

If an element, attribute, or variant is not listed here, do not rely on it for page authoring.

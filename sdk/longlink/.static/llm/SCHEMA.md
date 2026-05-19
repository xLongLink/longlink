# LongLink XML Schema

This document is the human-readable source of truth for LongLink XML pages.
Use it to author valid XML without reading the SDK code.
If this document and implementation differ, update this document first and then align the code.

## Core Rules

- Every document starts with a `<longlink>` root element.
- Element names are case-sensitive.
- XML attributes map to component props.
- `${...}` expressions are evaluated against runtime state and scope.
- Unknown attributes may pass XSD validation, but only documented attributes are supported by LongLink.
- A valid page must use only the elements and attributes described here.
- Do not rely on SDK code, samples, or docs outside this file for XML authoring rules.

### Internal Parser Output

- Raw text content becomes internal `Text` nodes during parsing. Do not author `Text` directly in XML pages.

## Expression Model

LongLink evaluates JavaScript-like expressions inside `${...}`.

### Implemented

- Expressions can read from runtime state and lexical scope.
- Expressions may appear in attribute values and text nodes.
- Strings wrapped in `${...}` can resolve to non-string values.
- Nested objects and arrays in `json` values are resolved recursively.
- Scope is lexical: child elements read from their nearest parent scope first, then walk outward.
- Membership checks like `${gridSearch in 'Revenue overview'}` are supported for strings, arrays, and objects.
- Do not use bare `{name}` or `{{...}}` authoring syntax.
- Use `${...}` expressions and `$name` references only.

### Limits

- Use expressions for literal text, dotted lookups, wrapped values, array literals, object literals, template literals, basic arithmetic, and mixed text interpolation.
- Do not rely on statements, function calls, assignments, comparisons, logical operators, ternaries, optional chaining, or globals.

## Global XML Patterns

### Conditional Rendering

Any documented XML element except `<longlink>` may use `if="condition"`.

If the expression is false, the element is not rendered.

### Reusable State Slots

`<State>` and `<Query>` both create a slot identified by `id`.

- `<State id="user" value="John Doe" />` creates a state object with a `value` field.
- `<State id="filters" search="Revenue" page="1" />` creates an object state slot.
- `<Query id="user" path="/endpoint" />` fetches data into the slot. `id` and `path` must be literal text.
- Both elements are self-closing and do not allow children.

### Iteration

`<For>` loops over an array.

```xml
<For each="orders" as="order">
  <P>${order.title}</P>
</For>
```

## Root Element

### `<longlink>`

Defines the root shell.

Attributes:

- None. The root element does not accept attributes, including `if`.

Children:

- Any documented XML element.

Behavior:

- SDK metadata exposes page paths directly.

Example: `<longlink><P>Dashboard</P></longlink>`

## Primitives

### `<State>`

Declares local reactive state.

Attributes:

- `id` required. State key.
- `value` optional. A normal field on the seeded state object.
- Any other attribute becomes a field on the seeded state object.

Behavior:

- The state is exposed as `ctx.values[id]`.
- State values are stored as proxied objects.
- Arrays and nested objects remain proxied through Valtio.
- The state starts as an object seeded from the declared attributes.
- Object fields are parsed as JSON literals when possible and otherwise evaluated as expressions.
- `State` must not contain child elements.

Example:

```xml
<State id="filters" search="Revenue" page="1" />
```

### `<Query>`

Fetches JSON data and stores it in query state.

Attributes:

- `id` required. Query key.
- `path` required. Request path or absolute URL. Must be literal text.

Behavior:

- Fetched data is exposed as `ctx.values[id]`.
- Descendants can read it through expressions.
- `Query` must not contain child elements.

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

Behavior:

- Renders as an inline SVG icon.
- Supports the global `if` attribute.

## Field

### `<FieldSet>`

Groups a form section.

Attributes:

### `<FieldLegend>`

Renders the fieldset legend.

Attributes:

- `variant` optional. Use `legend` or `label`.

### `<FieldGroup>`

Groups related fields inside a fieldset.

Attributes:

### `<Field>`

Renders one field row.

Attributes:

- `orientation` optional. Use `vertical`, `horizontal`, or `responsive`.

### `<FieldContent>`

Field content slot.

Attributes:

### `<FieldLabel>`

Field label slot.

Attributes:

- `htmlFor` optional. Target control id.

### `<FieldTitle>`

Field title slot.

Attributes:

### `<FieldDescription>`

Field description slot.

Attributes:

### `<FieldSeparator>`

Separates field sections.

Attributes:

Children:

- Optional separator label text.

### `<FieldError>`

Field error slot.

Attributes:

- `errors` optional. Error list expression.

Children:

- Optional error message content.

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

- `variant` optional. Badge style variant. Use `default`, `secondary`, `destructive`, `outline`, `ghost`, or `link`.

Behavior:

- Renders inline content using the shared badge shell.
- Supports the global `if` attribute.

Example: `<Badge variant="secondary">New</Badge>`

## Avatar

### `<Avatar>`

Renders a single user avatar shell.

Attributes:

- `size` optional. Avatar size variant. Use `default`, `sm`, or `lg`.

Behavior:

- Use `AvatarImage`, `AvatarFallback`, and `AvatarBadge` inside `Avatar`.
- Supports the global `if` attribute.

Example:

```xml
<Avatar size="sm">
  <AvatarImage src="/ada.png" alt="Ada Lovelace" />
  <AvatarFallback>AL</AvatarFallback>
  <AvatarBadge>1</AvatarBadge>
</Avatar>
```

### `<AvatarImage>`

Renders the avatar image slot.

Attributes:

- `src` optional. Image source URL.
- `alt` optional. Image alt text.

### `<AvatarFallback>`

Renders fallback content when the image is unavailable.

Attributes:

### `<AvatarBadge>`

Renders the badge overlay on top of an avatar.

Attributes:

## Columns

### `<Columns>`

Renders a full-width column row.

Attributes:

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

Behavior:

- `Column` content renders inside its own width box.

## Stack

### `<Stack>`

Renders children in a vertical stack.

Attributes:

Behavior:

- Children render in a vertical column with spacing.
- Supports the global `if` attribute.

Example:

```xml
<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>
```

## Grid

### `<Grid>`

Renders a full-width grid shell.

Attributes:

- `columns` optional. Number of equal-width columns.

Behavior:

- `columns` expands to a CSS grid template with equal tracks.
- Use `Card`, `FieldSet`, or other layout children inside `Grid`.

Example:

```xml
<State id="gridSearch" value="" />
<InputGroup>
  <InputGroupAddon>
    <Icon name="search" />
  </InputGroupAddon>
  <InputGroupInput value="$gridSearch" placeholder="Search cards" />
</InputGroup>
<Grid columns="3">
  <Card if="${gridSearch.value}">One</Card>
  <Card if="${gridSearch.value}">Two</Card>
  <Card if="${gridSearch.value}">Three</Card>
</Grid>
```

## Card

### `<Card>`

Renders a grouped content shell.

Attributes:

- `size` optional. Card density variant. Use `default` or `sm`.

Behavior:

- Renders content using the shared shadcn card base.
- Supports the global `if` attribute.
- Use `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` inside `Card`.

Example: `<Card><CardHeader><CardTitle>Card Title</CardTitle></CardHeader><CardContent><P>Card Content</P></CardContent></Card>`

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

Behavior:

- Renders inside a horizontal scroll container.
- Use `TableHeader`, `TableBody`, and `TableFooter` inside `Table`.
- Use `TableRow` inside header, body, and footer sections.
- Use `TableHead` for header cells and `TableCell` for body cells.

Example:

```xml
<Table>
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
<Dialog open="${true}">
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

## Tooltip

### `<TooltipProvider>`

Provides tooltip context for descendant tooltip roots.

### `<Tooltip>`

Renders a tooltip root shell.

Attributes:

- `open` optional. Control whether the tooltip is open.
- `defaultOpen` optional. Open the tooltip on first render.

Behavior:

- Wrap tooltip roots in `TooltipProvider` when using multiple tooltips on a page.
- Use `TooltipTrigger` for the hover or focus target.
- Use `TooltipContent` for the popup body.

Example:

```xml
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Tooltip text</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### `<TooltipTrigger>`

Trigger slot for the tooltip target.

### `<TooltipContent>`

Tooltip popup content.

Attributes:

- `align` optional. Popup alignment.
- `alignOffset` optional. Alignment offset.
- `hidden` optional. Hide the popup.
- `side` optional. Popup placement side.
- `sideOffset` optional. Distance from the trigger.

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
- `orientation` optional. Tabs orientation. Use `horizontal` or `vertical`.
- `TabsList` variant optional. Use `default` or `line`.

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

### `<Menu>`

Renders a sidebar-style menu shell with expandable subsections.

Attributes:

- `defaultValue` optional. Initial active item value.
- `value` optional. Controlled active item value.

Children:

- `MenuList`
- `MenuContent`

Behavior:

- `MenuList` contains `MenuSection` items.
- `MenuSection` may contain `MenuSubSection` items.
- Each `MenuSection`, `MenuSubSection`, and `MenuContent` requires a `value` attribute.
- `MenuContent` panels use matching `value` keys.
- A section with subsections expands to show its nested items.

Example:

```xml
<Menu defaultValue="overview">
  <MenuList>
    <MenuSection value="overview">Overview</MenuSection>
    <MenuSection value="settings">Settings
      <MenuSubSection value="profile">Profile</MenuSubSection>
      <MenuSubSection value="billing">Billing</MenuSubSection>
    </MenuSection>
  </MenuList>
  <MenuContent value="overview">Overview content</MenuContent>
  <MenuContent value="settings">Settings content</MenuContent>
  <MenuContent value="profile">Profile content</MenuContent>
  <MenuContent value="billing">Billing content</MenuContent>
</Menu>
```

## Form Controls

### `<Button>`

Styled trigger shell.

Attributes:

- `submit` optional. When truthy, renders a native submit button.
- `disabled` optional. Disables the rendered trigger.
- `size` optional. Button size variant. Use `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, or `icon-lg`.
- `variant` optional. Button style variant. Use `default`, `outline`, `secondary`, `ghost`, `destructive`, or `link`.

Behavior:

- Use `Button` for plain triggers and submit controls.
- `Button` does not send requests or navigate.

Example: `<Button variant="outline">Open dialog</Button>`

### `<Action>`

Request action trigger.

Attributes:

- `action` optional. Target path to call.
- `method` optional. HTTP method string. Defaults to `POST`.
- `json` optional. Request body value or JSON string.
- `invalidate` optional. Array expression of slot ids to rerun.

Behavior:

- If `action` is empty, the action only reruns invalidation targets.
- The request body is resolved at click time so it sees the latest runtime state.
- `invalidate` refetches the named query slots after the request succeeds.
- The trigger content comes from the element children.

Example: `<Action action="/issues" json='${{ title: issue.title }}'>Save</Action>`

### `<ButtonGroup>`

Groups buttons, actions, and inputs into a shared action strip.

Attributes:

- `orientation` optional. Use `horizontal` or `vertical`.

Children:

- `Button`
- `Action`
- `Input`
- `ButtonGroupText`
- `ButtonGroupSeparator`

Behavior:

- Buttons, actions, and inputs share the group chrome from the runtime component.
- Use `ButtonGroupText` for inline labels or hints.
- Use `ButtonGroupSeparator` to split grouped actions.

Example:

```xml
<ButtonGroup>
  <Button variant="outline">Cancel</Button>
  <Input placeholder="Search" />
  <Button>Search</Button>
</ButtonGroup>
```

### `<ButtonGroupText>`

Inline text segment inside a button group.

Attributes:

### `<ButtonGroupSeparator>`

Visual separator between button group segments.

Attributes:

- `orientation` optional. Use `horizontal` or `vertical`.

### `<InputGroup>`

Groups text inputs, add-ons, and action buttons into a shared input chrome.

Attributes:

- `if` supported globally.

Children:

- `InputGroupAddon`
- `InputGroupButton`
- `InputGroupText`
- `InputGroupInput`
- `InputGroupTextarea`

Behavior:

- `InputGroupInput` and `InputGroupTextarea` render the editable control slots.
- `InputGroupAddon` renders inline or block add-ons around the control.
- `InputGroupButton` renders a compact button inside the shared shell.

Example:

```xml
<InputGroup>
  <InputGroupAddon>@</InputGroupAddon>
  <InputGroupInput value="user.handle" placeholder="Handle" />
  <InputGroupButton>Search</InputGroupButton>
</InputGroup>
```

### `<InputGroupAddon>`

Text or control add-on inside an input group.

Attributes:

- `align` optional. Use `inline-start`, `inline-end`, `block-start`, or `block-end`.

### `<InputGroupButton>`

Compact button rendered inside an input group.

Attributes:

- `disabled` optional. Disables interaction.
- `size` optional. Use `xs`, `sm`, `icon-xs`, or `icon-sm`.
- `type` optional. Use `button`, `submit`, or `reset`.
- `variant` optional. Button variant. Use `default`, `outline`, `secondary`, `ghost`, `destructive`, or `link`.

### `<InputGroupText>`

Inline text slot inside an input group.

### `<InputGroupInput>`

Single-line editable input inside an input group.

Attributes:

- `label` optional. Fallback placeholder text.
- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `id` optional. Control id for associated labels.
- `autoComplete` optional. Browser autocomplete hint.
- `disabled` optional. Disables interaction.
- `aria-invalid` optional. Marks the field invalid.
- `type` optional. Input type.

### `<InputGroupTextarea>`

Multi-line editable textarea inside an input group.

Attributes:

- `label` optional. Fallback placeholder text.
- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `rows` optional. Visible row count.
- `cols` optional. Visible column count.

### `<Label>`

Form label for controls.

Attributes:

- `htmlFor` optional. Target control id.

Behavior:

- Renders as a normal HTML label.
- Supports the global `if` attribute.

### `<Checkbox>`

Binary toggle control.

Attributes:

- `checked` optional. Reactive state slot or current checked value.
- `defaultChecked` optional. Initial checked state.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.

Behavior:

- When `checked` resolves to a Valtio-backed state slot, toggle updates write back to `state.value`.
- Otherwise, `defaultChecked` sets the initial checked state.
- Supports the global `if` attribute.

### `<Toggle>`

Button-style toggle control.

Attributes:

- `pressed` optional. Reactive state slot or current pressed value.
- `defaultPressed` optional. Initial pressed state.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `size` optional. Toggle size variant. Use `sm`, `default`, or `lg`.
- `variant` optional. Toggle style variant. Use `default` or `outline`.

Behavior:

- When `pressed` resolves to a Valtio-backed state slot, toggle updates write back to `state.value`.
- Otherwise, `defaultPressed` sets the initial pressed state.
- Supports the global `if` attribute.

### `<ToggleGroup>`

Group of toggle buttons.

Attributes:

- `type` optional. Use `single` or `multiple`.
- `defaultValue` optional. Initial selected value or values.
- `disabled` optional. Disables interaction.
- `loopFocus` optional. Enables arrow-key looping.
- `orientation` optional. Use `horizontal` or `vertical`.
- `size` optional. Group size variant. Use `sm`, `default`, or `lg`.
- `spacing` optional. Gap between items.
- `value` optional. Reactive state slot or current selected value(s).
- `variant` optional. Toggle style variant. Use `default` or `outline`.

### `<ToggleGroupItem>`

Toggle button within a group.

Attributes:

- `value` required. Unique item value.
- `size` optional. Item size variant. Use `sm`, `default`, or `lg`.
- `variant` optional. Item style variant. Use `default` or `outline`.

### `<RadioGroup>`

Group of radio buttons.

Attributes:

- `defaultValue` optional. Initial selected value.
- `disabled` optional. Disables interaction.
- `form` optional. Owning form id.
- `name` optional. Form field name.
- `readOnly` optional. Prevents selection changes.
- `required` optional. Requires a selection.
- `value` optional. Reactive state slot or current selected value.

### `<RadioGroupItem>`

Radio button within a group.

Attributes:

- `value` required. Unique item value.
- `disabled` optional. Disables interaction.
- `readOnly` optional. Prevents selection changes.
- `required` optional. Requires a selection.

### `<Switch>`

Binary switch control.

Attributes:

- `checked` optional. Reactive state slot or current checked value.
- `defaultChecked` optional. Initial checked state.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `size` optional. Switch size variant. Use `sm` or `default`.

Behavior:

- When `checked` resolves to a Valtio-backed state slot, toggle updates write back to `state.value`.
- Otherwise, `defaultChecked` sets the initial checked state.
- Supports the global `if` attribute.

### `<Slider>`

Range or single-value slider control.

Attributes:

- `value` optional. Reactive state slot or current slider value(s).
- `defaultValue` optional. Initial slider value(s).
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `min` optional. Minimum slider value.
- `max` optional. Maximum slider value.
- `name` optional. Form field name.
- `orientation` optional. Use `horizontal` or `vertical`.
- `step` optional. Step increment.

Behavior:

- When `value` resolves to a Valtio-backed state slot, slider updates write back to `state.value` or the bound array.
- Otherwise, `defaultValue` sets the initial slider position.
- Use wrapped array expressions such as `${[25]}` when you need more than one thumb value.
- If neither `value` nor `defaultValue` is provided, the slider starts at `min`.
- Supports the global `if` attribute.

### `<Input>`

Single-line text input.

Attributes:

- `label` optional. Fallback placeholder text.
- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `id` optional. Control id for associated labels.
- `autoComplete` optional. Browser autocomplete hint.
- `disabled` optional. Disables interaction.
- `aria-invalid` optional. Marks the field invalid.
- `type` optional. Input type.

Behavior:

- Renders a plain text input.
- When `value` resolves to a reactive Valtio-backed state slot, changes write back to `state.value`.
- Otherwise, the field uses `value` as its initial text.

Example:

```xml
<Input label="Your name" value="$user.name" />
```

### `<Textarea>`

Multi-line text input.

Attributes:

- `label` optional. Fallback placeholder text.
- `value` optional. Expression for the displayed text.
- `placeholder` optional.
- `disabled` optional. Disables interaction.
- `id` optional. Control id for associated labels.
- `rows` optional. Visible row count.
- `cols` optional. Visible column count.

Behavior:

- Renders a plain textarea.
- When `value` resolves to a reactive Valtio-backed state slot, changes write back to `state.value`.
- Otherwise, the field uses `value` as its initial text.

Example:

```xml
<Textarea label="Notes" value="Draft notes" rows="4" />
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

- `<P>`
- `<A>`
- `<Br>`
- `<B>`
- `<H1>`
- `<H2>`
- `<H3>`
- `<H4>`
- `<Code>`
- `<S>`
- `<Sup>`
- `<Sub>`
- `<U>`
- `<Ul>`
- `<Li>`
- `<Ol>`

### `<P>`

Renders a paragraph element.

Attributes:

Behavior:

- Renders as a normal HTML paragraph.
- Supports the global `if` attribute.

### `<A>`

Renders a standard anchor link.

Attributes:

- `href` optional. Link target.
- `active` optional. Visual state behavior. Use `always` or `hover`. Defaults to `hover`.

Behavior:

- Renders as a normal HTML anchor.
- Supports the global `if` attribute.

Example: `<A href="/settings" active="always">Open settings</A>`

### `<Br>`

Renders a spacer break.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<B>`

Renders bold text.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<H1>`

Renders a primary heading.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<H2>`

Renders a secondary heading.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<H3>`

Renders a tertiary heading.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<H4>`

Renders a quaternary heading.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Code>`

Renders inline code.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<S>`

Renders strikethrough text.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Sup>`

Renders superscript text.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Sub>`

Renders subscript text.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<U>`

Renders underlined text.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Ul>`

Renders an unordered list.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Li>`

Renders a list item.

Attributes:

Behavior:

- Supports the global `if` attribute.

### `<Ol>`

Renders an ordered list.

Attributes:

Behavior:

- Supports the global `if` attribute.

## Summary

If an element, attribute, or variant is not listed here, do not rely on it for page authoring.

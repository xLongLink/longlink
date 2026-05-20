---
name: longlink
description: LongLink usage guide for building XML-backed pages and apps
---

Use this skill when you want to write LongLink XML pages and understand what each tag does.
It focuses on authoring complete, valid XML documents and using the runtime components correctly.

## How To Use LongLink XML

- Start every page with `<longlink>`.
- Use `<State>` for local reactive data.
- Use `<Query>` for fetched JSON.
- Use `<For>` to render arrays.
- Use `<Action>` to submit requests and invalidate state.
- Use `if="..."` for conditional rendering.
- Use `${...}` expressions for derived values.
- Use `$name` references to read runtime state.

## Component Guide

### Root and Data

- `<longlink>`: page root shell. It holds the page structure.
- `<State id="..." ... />`: local state slot. `id` names the slot. Each attribute becomes a field on the state object.
- `<Query id="..." path="..." />`: fetches JSON into a state slot. `id` and `path` must be literal text.
- `<For each="..." as="...">`: iterates arrays and binds one item name into child scope.
- `<Action action="...">`: submits requests or just invalidates when no action is supplied.

### Layout

- `<Columns>`: page split into columns.
- `<Column width="...">`: one column inside a split.
- `<Grid columns="...">`: grid layout for cards and forms.
- `<Stack>`: vertical spacing stack.
- `<Divider>`: visual separator.

### Typography and Inline

- `<P>`: paragraph text.
- `<Br>`: line break.
- `<A>`: link.
- `<B>`: bold text.
- `<Code>`: inline code.
- `<H1>`, `<H2>`, `<H3>`, `<H4>`: headings.
- `<S>`: strikethrough.
- `<Sub>`: subscript.
- `<Sup>`: superscript.
- `<U>`: underline.
- `<Ul>` / `<Ol>` / `<Li>`: list container and items.
- `<Icon name="...">`: Lucide icon by name.

### Buttons and Actions

- `<Button>`: standard action button.
- `<ButtonGroup>`: grouped actions.
- `<ButtonGroupText>`: text segment inside a button group.
- `<ButtonGroupSeparator>`: separator inside a button group.

### Cards and Media

- `<Card>`: content card container.
- `<CardHeader>`: top card section.
- `<CardTitle>`: card title.
- `<CardDescription>`: card subtitle or description.
- `<CardAction>`: right-aligned action area.
- `<CardContent>`: main card content.
- `<CardFooter>`: bottom card section.
- `<Badge>`: compact label or status pill.
- `<Avatar>`: avatar container.
- `<AvatarImage>`: image inside an avatar.
- `<AvatarFallback>`: fallback initials or text.
- `<AvatarBadge>`: badge attached to an avatar.
- `<Hero>`: page header block.
- `<HeroTitle>`: hero title.
- `<HeroDescription>`: hero description.
- `<HeroContent>`: hero action/content slot.

### Forms and Inputs

- `<Input>`: single-line input.
- `<Textarea>`: multi-line input.
- `<InputGroup>`: grouped input shell.
- `<InputGroupAddon>`: leading or trailing addon.
- `<InputGroupInput>`: input inside a group.
- `<InputGroupButton>`: button inside a group.
- `<InputGroupText>`: text inside a group.
- `<InputGroupTextarea>`: textarea inside a group.
- `<Checkbox>`: boolean checkbox.
- `<Switch>`: boolean toggle.
- `<Slider>`: range slider.
- `<Toggle>`: single toggle button.
- `<ToggleGroup>`: group of toggles.
- `<ToggleGroupItem>`: one toggle item.
- `<RadioGroup>`: radio group.
- `<RadioGroupItem>`: one radio option.
- `<Select>`: select shell.
- `<SelectTrigger>`: select trigger.
- `<SelectValue>`: selected value or placeholder.
- `<SelectContent>`: dropdown panel.
- `<SelectGroup>`: grouped options.
- `<SelectLabel>`: group label.
- `<SelectItem>`: selectable option.
- `<SelectSeparator>`: separator.
- `<Label>`: form label.

### Field Layout

- `<FieldSet>`: form section.
- `<FieldLegend>`: fieldset legend.
- `<FieldGroup>`: related field group.
- `<Field>`: one field row.
- `<FieldContent>`: field content area.
- `<FieldLabel>`: label slot.
- `<FieldTitle>`: field title.
- `<FieldDescription>`: helper text.
- `<FieldSeparator>`: divider between field parts.
- `<FieldError>`: error message area.

### Tabs, Dialogs, Tooltip

- `<Tabs>`: tabs shell.
- `<TabsList>`: tab list.
- `<TabsTrigger>`: tab button.
- `<TabsContent>`: tab panel.
- `<Dialog>`: dialog shell.
- `<DialogTrigger>`: trigger slot, often a `Button` or `A`.
- `<DialogContent>`: dialog panel.
- `<DialogHeader>`: dialog header.
- `<DialogTitle>`: dialog title.
- `<DialogDescription>`: dialog description.
- `<DialogFooter>`: dialog footer.
- `<TooltipProvider>`: tooltip context wrapper.
- `<Tooltip>`: tooltip shell.
- `<TooltipTrigger>`: trigger.
- `<TooltipContent>`: tooltip panel.

### Menu and Navigation

- `<Menu>`: sidebar/menu shell.
- `<MenuList>`: menu list.
- `<MenuSection>`: top-level section.
- `<MenuSubSection>`: nested section.
- `<MenuContent>`: panel for the active menu item.

## Common Patterns

- Use `<State id="filters" search="Revenue" page="1" />` for grouped local state.
- Use `<Query id="products" path="/api/products" />` for data loading.
- Use `<For each="${products.items}" as="product">` for repeated UI.
- Use `<Action action="/items" method="POST" json='${{ name: item.name }}'>` for CRUD actions.
- Use slot tags inside their parent components, not on their own.

## Example

```xml
<longlink>
  <State id="cart" value="[]" />
  <Query id="products" path="/api/products" />
  <For each="$products.items" as="product">
    <Card>
      <CardHeader>
        <CardTitle>${product.name}</CardTitle>
        <CardDescription>${product.sku}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Action action="/cart/add" method="POST" json="${{ productId: product.id, quantity: 1 }}">
          Add to cart
        </Action>
      </CardFooter>
    </Card>
  </For>
</longlink>
```

## Writing Tips

- Keep pages complete and predictable.
- Prefer explicit nesting over clever shortcuts.
- Use the simplest component that matches the UI need.
- Keep expressions readable and limited to supported runtime syntax.

# Components

Components handle visible content and user actions.
Use them when a page needs navigation or form input.
This page documents the current XML element surface.

The parser also emits internal raw text nodes for raw text content. Do not author them directly.

## Avatar

Use `Avatar` with `AvatarBadge`, `AvatarFallback`, and `AvatarImage` for user identity chips.

```xml
<AvatarGroup>
  <Avatar size="sm">
    <AvatarImage src="/ada.png" alt="Ada Lovelace" />
    <AvatarFallback>AL</AvatarFallback>
    <AvatarBadge>1</AvatarBadge>
  </Avatar>
  <Avatar>
    <AvatarImage src="/grace.png" alt="Grace Hopper" />
    <AvatarFallback>GH</AvatarFallback>
  </Avatar>
  <AvatarGroupCount>+2</AvatarGroupCount>
</AvatarGroup>
```

`Avatar.size` accepts `default`, `sm`, or `lg`.
`AvatarGroup` stacks multiple avatars with shared spacing.
`AvatarGroupCount` renders the trailing count chip.

## Badge

Use the `Badge` component for compact status labels and tags.

```xml
<Badge variant="secondary">New</Badge>
```

`variant` is optional.

## Button

Use the `Button` component to navigate or trigger an action.

```xml
<Button action="/issues/new" method="GET" variant="default">
  Create issue
</Button>
```

`action` is the target path.
`method="GET"` renders a navigation link to `action`.
`method="POST"`, `PUT`, and `DELETE` send a data-changing request to `action`.
If `action` is empty, the button only runs invalidation.
`json` is evaluated at click time.
If `json` is omitted, the request is sent without a JSON body.
`invalidate` accepts an array expression of slot ids to rerun after success.

`method` defaults to `POST`.

## ButtonGroup

Use `ButtonGroup` with `ButtonGroupText` and `ButtonGroupSeparator` to build compact action strips.

```xml
<ButtonGroup orientation="horizontal">
  <Button variant="outline">Cancel</Button>
  <ButtonGroupText>or</ButtonGroupText>
  <Button>Save</Button>
</ButtonGroup>
```

`orientation` accepts `horizontal` or `vertical`.
`ButtonGroupText` renders inline text inside the group.
`ButtonGroupSeparator` renders a visual split between group segments.

## InputGroup

Use `InputGroup` with `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, and `InputGroupTextarea` to build grouped form controls.

```xml
<InputGroup>
  <InputGroupAddon>
    <Icon name="search" />
  </InputGroupAddon>
  <InputGroupInput label="Handle" value="user.handle" />
  <InputGroupButton>
    Search <Icon name="arrow-right" />
  </InputGroupButton>
</InputGroup>
```

`InputGroupInput` behaves like `Input`, but renders inside the grouped chrome.
`InputGroupTextarea` behaves like `Textarea`, but renders inside the grouped chrome.
`InputGroupAddon` renders prefix or suffix content.
`InputGroupButton` renders a compact button inside the group.
`InputGroupText` renders inline helper text.

## Card

Use the `Card` component for grouped content blocks and simple dashboard panels.

```xml
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <CardAction>Card Action</CardAction>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

`CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, and `CardTitle` compose the shadcn card layout.
`size="sm"` keeps the compact card density.

## Checkbox

Use `Checkbox` for binary form toggles.

```xml
<Checkbox checked="settings.enabled" id="enabled" />
```

`checked` can bind to a reactive state slot.
`defaultChecked` seeds the initial value when `checked` is not bound.
`disabled` and `id` are supported.

## Columns

Use `Columns` with `Column` children for side-by-side layout rows.

```xml
<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>
```

`Column.width` is required and uses the percentage share of the row.

### Column

`Column` renders one percentage-based slot inside `Columns`.
`width` is required.

## Dialog

Use `Dialog` with `DialogContent` and `DialogTrigger` for modal workflows and confirmations.

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

`DialogContent` renders in a portal and includes the standard close affordance.
`DialogFooter` holds actions for the dialog body.
`DialogHeader` groups the title and description.
`open` and `defaultOpen` control dialog visibility.

## Divider

Use the `Divider` component to separate sections with a horizontal rule.

```xml
<Divider />
```

## Field

Use `Field`, `FieldContent`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLabel`, `FieldLegend`, `FieldSeparator`, `FieldSet`, and `FieldTitle` to build grouped form layouts.

```xml
<FieldSet>
  <FieldLegend>Profile</FieldLegend>
  <FieldDescription>This appears on invoices and emails.</FieldDescription>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="name">Full name</FieldLabel>
      <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
      <FieldDescription>This appears on invoices and emails.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input id="username" autoComplete="off" aria-invalid />
      <FieldError>Choose another username.</FieldError>
    </Field>
    <Field orientation="horizontal">
      <Switch id="newsletter" />
      <FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel>
    </Field>
  </FieldGroup>
</FieldSet>
```

`Field` supports `vertical`, `horizontal`, and `responsive` orientations.
`FieldError` can render children or an `errors` expression.
`FieldLabel` and `FieldTitle` both render the field label slot.
`FieldLegend` accepts `variant="legend"` or `variant="label"`.

## Hero

Use the `Hero` shell for page headers with title, description, and action content.
`HeroContent` renders in a separate right-side slot.
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

`HeroContent`, `HeroDescription`, and `HeroTitle` are the three supported hero slots.
`Hero.icon` uses the same Lucide icon names as `<Icon>`.

## HTML Bridge

Use lowercase HTML tags for simple bridges.

```xml
<a href="/icons">
  <Icon name="sparkles" />
  Open icons
</a>

<h2>Team</h2>

<code>dashboard_id</code>

<ol>
  <li>Projects</li>
  <li>Users</li>
</ol>
```

`a`, `b`, `br`, `code`, `h1`, `h2`, `h3`, `h4`, `li`, `ol`, `p`, `s`, `sub`, `sup`, `u`, and `ul` are the current HTML bridge elements.
Use `a` with `href` for links.
Use `br` for separators.
Use heading tags for document structure.
Use `b` for bold text.
Use `code` for inline code.
Use `s` for strikethrough text.
Use `sup` and `sub` for inline annotations.
Use `u` for underlined text.
Use `ol` and `li` for ordered lists.
Use `ul` and `li` for simple lists.

## Icon

Use `Icon` for standalone Lucide icons in cards, buttons, and inline layout chrome.

```xml
<Icon name="layout-grid" />
```

`name` is required.

## Input

Use the `Input` component for single-line text entry.

```xml
<Input label="Issue title" value="user.name" />
```

`label` is optional and is used as the placeholder when `placeholder` is omitted.
`id`, `autoComplete`, `disabled`, and `aria-invalid` are also supported.

When `value` resolves to a reactive Valtio-backed state slot, the input stays in sync and writes back to `state.value`.
Otherwise, `value` only initializes the field.

## Label

Use `Label` for form labels.

```xml
<Label htmlFor="enabled">Enabled</Label>
```

`htmlFor` points at the control id.

## RadioGroup

Use `RadioGroup` with `RadioGroupItem` for single-choice form controls.

```xml
<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low">Low</RadioGroupItem>
  <RadioGroupItem value="medium">Medium</RadioGroupItem>
  <RadioGroupItem value="high">High</RadioGroupItem>
</RadioGroup>
```

`defaultValue` and `value` can seed or bind the selected option.
`name`, `form`, `required`, `readOnly`, and `disabled` are supported.
`ToggleGroupItem.value` is required.

## Select

Use `Select` with `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectTrigger`, and `SelectValue` for single-choice menus.

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

`SelectItem` requires a `value`.
`open` and `defaultOpen` control menu visibility.
`value` can bind to a reactive state slot; otherwise `defaultValue` seeds the initial selection.

## Slider

Use `Slider` for single-value and range controls.

```xml
<Slider value="volume" min="0" max="100" step="5" />
```

`value` can bind to a reactive state slot or seed the initial thumb position.
`defaultValue` is an explicit fallback when you do not want to use `value`.
Use wrapped expressions like `${[25]}` when you need multiple thumb values.
`min`, `max`, `step`, `orientation`, `disabled`, `id`, and `name` are supported.

## Switch

Use `Switch` for binary on/off controls.

```xml
<Switch checked="settings.enabled" id="enabled" size="sm" />
```

`checked` can bind to a reactive state slot.
`defaultChecked` seeds the initial value when `checked` is not bound.
`size` accepts `sm` or `default`.

## Table

Use `Table` with `TableBody`, `TableFooter`, and `TableHeader` for tabular data.

```xml
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Quarter</TableHead>
      <TableHead>Revenue</TableHead>
      <TableHead>Growth</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Q1</TableCell>
      <TableCell>$120k</TableCell>
      <TableCell>12%</TableCell>
      <TableCell>On track</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

`TableCell` is for body cells.
`TableHead` is for column headers.
`TableRow` groups cells in each section.

## Tabs

Use `Tabs` with `TabsContent`, `TabsList`, and `TabsTrigger` to switch between related panels.

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

`TabsContent` and `TabsTrigger` require a matching `value`.
`TabsList` supports the shadcn `variant` prop.
Only the active `TabsContent` is rendered.

## Textarea

Use `Textarea` for multi-line text entry.

```xml
<Textarea label="Notes" value="Draft notes" rows="4" />
```

`label` is optional and falls back to the placeholder when `placeholder` is omitted.
`value` can bind to a reactive state slot.
`disabled`, `id`, `rows`, and `cols` are supported.

## Toggle

Use `Toggle` for button-style on/off controls.

```xml
<Toggle pressed="settings.enabled" id="enabled" size="sm">
  Enabled
</Toggle>
```

`pressed` can bind to a reactive state slot.
`defaultPressed` seeds the initial value when `pressed` is not bound.
`variant` accepts `default` or `outline`.
`size` accepts `sm`, `default`, or `lg`.

## ToggleGroup

Use `ToggleGroup` with `ToggleGroupItem` for segmented single- or multi-select controls.

```xml
<ToggleGroup type="single">
  <ToggleGroupItem value="a">A</ToggleGroupItem>
  <ToggleGroupItem value="b">B</ToggleGroupItem>
  <ToggleGroupItem value="c">C</ToggleGroupItem>
</ToggleGroup>
```

`type` accepts `single` or `multiple`.
`defaultValue` and `value` can be used to seed or bind the selected item set.
`orientation`, `size`, `variant`, `spacing`, `disabled`, and `loopFocus` are supported.

## Tooltip

Use `TooltipProvider` with `Tooltip`, `TooltipContent`, and `TooltipTrigger` for hover or focus help.

```xml
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent side="top">Tooltip text</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

`Tooltip` supports `open` and `defaultOpen`.
`TooltipContent` supports `align`, `alignOffset`, `hidden`, `side`, and `sideOffset`.
Wrap multiple tooltips in `TooltipProvider`.

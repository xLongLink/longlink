# Components

Components handle visible content and user actions.
Use them when a page needs navigation or form input.
This page documents the current component surface.

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

`HeroTitle`, `HeroDescription`, and `HeroContent` are the three supported hero slots.
`Hero.icon` uses the same Lucide icon names as `<Icon>`.

## Columns

Use `Columns` with `Column` children for side-by-side layout rows.

```xml
<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>
```

`Column.width` is required and uses the percentage share of the row.
`Columns` and `Column` both accept `className`.

### Column

`Column` renders one percentage-based slot inside `Columns`.
`width` is required.

## Icon

Use `Icon` for standalone Lucide icons in cards, buttons, and inline layout chrome.

```xml
<Icon name="layout-grid" className="size-5" />
```

`name` is required.
`className` is optional and can be used to tune size or color.

## Table

Use `Table` with `TableCaption`, `TableHeader`, `TableBody`, and `TableFooter` for tabular data.

```xml
<Table>
  <TableCaption>Revenue by quarter</TableCaption>
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

`TableHead` is for column headers.
`TableCell` is for body cells.
`TableRow` groups cells in each section.
`className` is available on every table part.

## HTML Bridge

Use lowercase HTML tags for simple bridges.

```xml
<a href="/icons">
  <Icon name="sparkles" className="size-5" />
  Open icons
</a>
```

`<p>` and `<a>` are the current HTML bridge elements.
Use `a` with `href` for links.

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

`CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` compose the shadcn card layout.
`size="sm"` keeps the compact card density.
Each card part also accepts `className` for local styling.

## Dialog

Use `Dialog` with `DialogTrigger` and `DialogContent` for modal workflows and confirmations.

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

`DialogHeader` groups the title and description.
`DialogFooter` holds actions for the dialog body.
`DialogContent` renders in a portal and includes the standard close affordance.
`open` and `defaultOpen` control dialog visibility.

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

## Badge

Use the `Badge` component for compact status labels and tags.

```xml
<Badge variant="secondary">New</Badge>
```

`variant` is optional.

## Checkbox

Use `Checkbox` for binary form toggles.

```xml
<Checkbox checked="settings.enabled" id="enabled" />
```

`checked` can bind to a reactive state slot.
`defaultChecked` seeds the initial value when `checked` is not bound.
`disabled` and `id` are supported.

## Label

Use `Label` for form labels.

```xml
<Label htmlFor="enabled">Enabled</Label>
```

`htmlFor` points at the control id.
`className` is optional.

## Switch

Use `Switch` for binary on/off controls.

```xml
<Switch checked="settings.enabled" id="enabled" size="sm" />
```

`checked` can bind to a reactive state slot.
`defaultChecked` seeds the initial value when `checked` is not bound.
`size` accepts `sm` or `default`.

## Textarea

Use `Textarea` for multi-line text entry.

```xml
<Textarea label="Notes" value="Draft notes" rows="4" />
```

`label` is optional and falls back to the placeholder when `placeholder` is omitted.
`value` can bind to a reactive state slot.
`className`, `disabled`, `id`, `rows`, and `cols` are supported.

## Input

Use the `Input` component for single-line text entry.

```xml
<Input label="Issue title" value="user.name" />
```

`label` is optional and is used as the placeholder when `placeholder` is omitted.
`id`, `className`, `autoComplete`, `disabled`, and `aria-invalid` are also supported.

When `value` resolves to a reactive Valtio-backed state slot, the input stays in sync and writes back to `state.value`.
Otherwise, `value` only initializes the field.

## Field

Use `FieldSet`, `FieldLegend`, `FieldDescription`, `FieldGroup`, `Field`, `FieldContent`, `FieldTitle`, `FieldLabel`, `FieldError`, and `FieldSeparator` to build grouped form layouts.

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
`FieldLegend` accepts `variant="legend"` or `variant="label"`.
`FieldError` can render children or an `errors` expression.
`FieldLabel` and `FieldTitle` both render the field label slot.

## Select

Use `Select` with `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, and `SelectSeparator` for single-choice menus.

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
`value` can bind to a reactive state slot; otherwise `defaultValue` seeds the initial selection.
`open` and `defaultOpen` control menu visibility.
`className` is available on the select slots for local styling.

## Divider

Use the `Divider` component to separate sections with a horizontal rule.

```xml
<Divider />
```

## Tabs

Use `Tabs` with `TabsList`, `TabsTrigger`, and `TabsContent` to switch between related panels.

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

`TabsTrigger` and `TabsContent` require a matching `value`.
`TabsList` supports the shadcn `variant` prop, and all tabs parts accept `className`.
Only the active `TabsContent` is rendered.

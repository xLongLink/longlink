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
`invalidate` accepts an array expression of slot ids to rerun after success.

`method` defaults to `POST`.

## Badge

Use the `Badge` component for compact status labels and tags.

```xml
<Badge variant="secondary">New</Badge>
```

`variant` is optional.

## Input

Use the `Input` component for single-line text entry.

```xml
<Input label="Issue title" value="user.name" />
```

`label` is optional and is used as the placeholder when `placeholder` is omitted.

When `value` resolves to a reactive Valtio-backed state slot, the input stays in sync and writes back to `state.value`.
Otherwise, `value` only initializes the field.

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

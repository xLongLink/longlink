# Layout

LongLink layout components arrange page sections, switch panels, and modal flows.

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

## Grid

Use `Grid` for full-width grid layouts.

```xml
<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>
```

`columns` sets the number of equal-width grid columns.

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

### DialogTrigger

Use `DialogTrigger` to open the dialog.

### DialogContent

`DialogContent` renders the modal body surface.

### DialogHeader

`DialogHeader` groups the title and description inside the dialog body.

### DialogTitle

`DialogTitle` renders the dialog title slot.

### DialogDescription

`DialogDescription` renders the dialog description slot.

### DialogFooter

`DialogFooter` renders the action row for the dialog body.

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

### TabsList

`TabsList` renders the tab button row.

### TabsTrigger

`TabsTrigger` renders one tab button and requires a `value`.

### TabsContent

`TabsContent` renders one tab panel and requires a matching `value`.

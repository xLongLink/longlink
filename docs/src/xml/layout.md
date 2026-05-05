# Layout

Layout components organize a page into visible sections and containers.
They control how content is grouped, positioned, and navigated.
Use them to shape the page structure before adding forms or data.
The sections below describe the main layout primitives.

## Menu

Use `<Menu>` to organize page content into navigable sections. Use `<MenuSection>` for top-level navigation entries, use `<MenuSubSection>` for the content inside a section, and set `root="true"` when a subsection should render as the section root. Root subsections can omit their `title` when the section label already provides the navigation entry.

```xml
<Menu>
  <MenuSection title="Overview" icon="layout-dashboard">
    <MenuSubSection root="true">
      <Card>
        <CardContent>
          <p>Overview content</p>
        </CardContent>
      </Card>
    </MenuSubSection>
  </MenuSection>

  <MenuSection title="Settings" icon="settings">
    <MenuSubSection title="General">
      <Card>
        <CardContent>
          <p>Settings content</p>
        </CardContent>
      </Card>
    </MenuSubSection>
  </MenuSection>
</Menu>
```

## Card

Use cards to group related content into clear sections. Use `<CardHeader>` for metadata and actions, `<CardContent>` for the main body, and `<CardFooter>` for secondary details. Set `size="sm"` for the compact card variant.

```xml
<Card size="sm">
  <CardHeader>
    <CardTitle>Deployment status</CardTitle>
    <CardDescription>Current state of the application.</CardDescription>
    <CardAction>
      <Button href="/deployments" variant="outline">Refresh</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>The application is running.</p>
  </CardContent>
  <CardFooter>
    <p>Last updated 2 minutes ago.</p>
  </CardFooter>
</Card>
```

## Columns

Use `<Columns>` and `<Column>` to create multi-column layouts. Each row uses the full available width, and the split is determined by the sum of the child `<Column>` spans. For example, `7` and `5` produce a 70/30 view.

```xml
<Columns>
  <Column span="7">
    <Card>
      <CardContent>
        <p>Main content</p>
      </CardContent>
    </Card>
  </Column>

  <Column span="5">
    <Card>
      <CardContent>
        <p>Secondary content</p>
      </CardContent>
    </Card>
  </Column>
</Columns>
```

## Grid

Use `<Grid>` for generic CSS grid containers.

```xml
<Grid>
  <Card>
    <CardContent>
      <p>Main content</p>
    </CardContent>
  </Card>

  <Card>
    <CardContent>
      <p>Secondary content</p>
    </CardContent>
  </Card>
</Grid>
```

## Dialog

Use `<Dialog>` to present modal content without leaving the page. Place the trigger outside the modal body, keep the header focused on the title and description, and use the footer for final actions.

```xml
<Dialog id="issue-dialog">
  <DialogTrigger>
    Open details
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Issue details</DialogTitle>
      <DialogDescription>Review the current issue state.</DialogDescription>
    </DialogHeader>
    <p>Dialog content goes here.</p>
  </DialogContent>
</Dialog>
```

## Tabs

Use tabs when the page needs multiple related views in the same section. `value` must match between `<TabsTrigger>` and `<TabsContent>`, and `defaultValue` selects the initially visible tab.

```xml
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    <Card>
      <CardContent>
        <p>Details content</p>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="activity">
    <Card>
      <CardContent>
        <p>Activity content</p>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

Use `<TabsList>`, `<TabsTrigger>`, and `<TabsContent>` together for tab navigation and panels.

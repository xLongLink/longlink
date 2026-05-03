# Layout

Layout components organize a page into visible sections and containers.
They control how content is grouped, positioned, and navigated.
Use them to shape the page structure before adding forms or data.
The sections below describe the main layout primitives.

## Hero

Use `<Hero>` to define the top section of a page. Place it near the top, use `title` and `subtitle` to describe the page clearly, and put actions such as `<Button>` inside the hero body.

```xml
<Page name="Issues" icon="bug">
  <Hero
    title="Issues"
    subtitle="Track and manage open work."
    icon="bug"
  >
    <Button text="Create issue" url="/issues/new" />
  </Hero>
</Page>
```

## Menu

Use `<Menu>` to organize page content into navigable sections. Use `<MenuSection>` for top-level navigation entries, use `<MenuSubSection>` for the content inside a section, and set `root="true"` when a subsection should render as the section root.

```xml
<Menu>
  <MenuSection title="Overview" icon="layout-dashboard">
    <MenuSubSection title="" root="true">
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

Use cards to group related content into clear sections. Use `<CardHeader>` for metadata and actions, `<CardContent>` for the main body, and `<CardFooter>` for secondary details.

```xml
<Card>
  <CardHeader>
    <CardTitle>Deployment status</CardTitle>
    <CardDescription>Current state of the application.</CardDescription>
    <CardAction>
      <Button text="Refresh" url="/deployments" variant="outline" />
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

Use `<Columns>` and `<Column>` to create multi-column layouts. Use `gap` on `<Columns>` to control spacing, use `span` for the current layout model, and keep in mind that legacy `widths` and `width` values are still supported by the renderer.

```xml
<Columns gap="16">
  <Column span="8">
    <Card>
      <CardContent>
        <p>Main content</p>
      </CardContent>
    </Card>
  </Column>

  <Column span="4">
    <Card>
      <CardContent>
        <p>Secondary content</p>
      </CardContent>
    </Card>
  </Column>
</Columns>
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

# Layout

Use layout components to structure a page into sections, navigation blocks, containers, and data views.

## Hero

Use `<Hero>` to define the top section of a page.

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

- Place `<Hero>` near the top of the page.
- Use `title` and `subtitle` to describe the page clearly.
- Place actions such as `<Button>` inside the hero body.

## Menu

Use `<Menu>` to organize page content into navigable sections.

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

- Use `<MenuSection>` for top-level navigation entries.
- Use `<MenuSubSection>` for the content shown within a section.
- Set `root="true"` when a subsection should render as the section root.

## Card

Use cards to group related content into clear sections.

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

- Use `<CardHeader>` for metadata and actions.
- Use `<CardContent>` for the main body.
- Use `<CardFooter>` for secondary details.

## Columns

Use `<Columns>` and `<Column>` to create multi-column layouts.

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

- Use `gap` on `<Columns>` to control spacing.
- Use `span` for the current layout model.
- Legacy `widths` and `width` values are still supported by the renderer.

## Tabs

Use tabs when the page needs multiple related views in the same section.

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

- `value` must match between `<TabsTrigger>` and `<TabsContent>`.
- `defaultValue` selects the initially visible tab.

## Table

Use tables to present structured data in rows and columns.

```xml
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Projects</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

```xml
<Table data='[{"name":"Projects","status":"Active"}]'>
  <Column key="name" label="Name" content="{name}" />
  <Column key="status" label="Status" content="{status}" />
</Table>
```

- Use explicit markup when the page controls every cell directly.
- Use `<Column>` definitions when table rows come from the `data` prop.

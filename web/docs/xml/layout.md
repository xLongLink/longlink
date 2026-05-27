---
lastUpdated: 2026-05-26
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/xml/layout.md
---

# Layout

XML layout components organize content into responsive sections and dialog-style surfaces.

## Card

Cards group related content.

```xml
<Card size="sm">
  <P>Card Content</P>
</Card>
```

## Columns

Columns render side-by-side sections. Column widths should add up to 100 across the row.

```xml
<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>
```

## Dialog

Dialog renders an overlay for focused actions and confirmations.

Use a trigger to open the dialog. Use `open` only when you need a controlled dialog.

```xml
<Dialog>
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete issue</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
  </DialogContent>
</Dialog>
```

## Flex

Flex arranges children in a row and can distribute space between them.

- `space="center"` centers the group.
- `space="around"` adds equal space around each item.
- `space="between"` pushes items to the edges.
- `space="evenly"` keeps equal spacing across the row.

```xml
<Flex space="between">
  <Button variant="outline">Cancel</Button>

  <ButtonGroup>
    <Button size="sm" variant="outline">Back</Button>
    <Button size="sm">Next</Button>
  </ButtonGroup>
</Flex>
```

## Grid

Grid renders evenly spaced child cards or panels.

```xml
<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>
```

## Menu

Menus expose sectioned navigation, nested subsections, and optional icons.

```xml
<Menu defaultValue="settings">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    <P>Today&apos;s snapshot.</P>
  </MenuSection>

  <MenuSection value="operations" label="Operations" icon="settings">
    <P>Live queue management.</P>

    <MenuSubSection value="orders" label="Orders">
      <P>Open orders waiting on fulfillment.</P>
    </MenuSubSection>
  </MenuSection>

  <MenuSection value="settings" label="Settings" icon="shield">
    <P>Workspace settings and permissions.</P>
  </MenuSection>
</Menu>
```

## Stack

Stack arranges content vertically with consistent spacing.

```xml
<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>
```

## Tabs

Tabs let users switch between related panels. Tabs can also show an icon per tab.

```xml
<Tabs defaultValue="overview">
  <Tab value="overview" label="Overview">
    <P>Overview content</P>
  </Tab>
  <Tab value="settings" label="Settings">
    <P>Settings content</P>
  </Tab>
</Tabs>
```

# Layout

TODO: Introduction

## Columns

TODO: Component description

```xml
<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>
```

## Grid

TODO: Component description

```xml
<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>
```

## Stack

TODO: Component description

```xml
<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>
```

## Dialog

TODO: Component description

Use `defaultOpen` to show the dialog open on first render without locking its state.

```xml
<Dialog defaultOpen="${true}">
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete issue</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
    <Button variant="outline">Cancel</Button>
    <Action action="/issues/1" method="DELETE">Delete</Action>
  </DialogContent>
</Dialog>
```

## Tabs

TODO: Component description

```xml
<Tabs defaultValue="overview">
  <Tab value="overview" label="Overview">Overview panel</Tab>
  <Tab value="settings" label="Settings">Settings panel</Tab>
</Tabs>
```

## Menu

```xml
<Menu defaultValue="first">
  <MenuSection value="overview" label="Overview">
    <P>Overview content</P>
  </MenuSection>
  <MenuSection value="settings" label="Settings">
    <P>Settings content</P>
    <MenuSubSection value="profile" label="Profile">
      <P>Profile content</P>
    </MenuSubSection>
    <MenuSubSection value="billing" label="Billing">
      <P>Billing content</P>
    </MenuSubSection>
  </MenuSection>
</Menu>
```

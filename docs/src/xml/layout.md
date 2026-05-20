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

## Dialog

TODO: Component description

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
      <Action action="/issues/1" method="DELETE">Delete</Action>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Tabs

TODO: Component description

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

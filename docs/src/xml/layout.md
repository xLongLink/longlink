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
      <Button>Delete</Button>
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
  <MenuList>
    <MenuSection value="overview">Overview</MenuSection>
    <MenuSection value="settings">
      Settings
      <MenuSubSection value="profile">Profile</MenuSubSection>
      <MenuSubSection value="billing">Billing</MenuSubSection>
    </MenuSection>
  </MenuList>
  <MenuContent value="overview">Overview content</MenuContent>
  <MenuContent value="settings">Settings content</MenuContent>
  <MenuContent value="profile">Profile content</MenuContent>
  <MenuContent value="billing">Billing content</MenuContent>
</Menu>
```

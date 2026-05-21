# Components

Reusable UI components for XML pages.

## Avatar

TODO: Component description

```xml
<Avatar size="sm">
  <AvatarImage src="/ada.png" alt="Ada Lovelace" />
  <AvatarFallback>AL</AvatarFallback>
  <AvatarBadge>1</AvatarBadge>
</Avatar>
```

## Badge

TODO: Component description

```xml
<Badge variant="secondary">New</Badge>
```

## Button

TODO: Component description

```xml
<Button variant="default">
  Create issue
</Button>
```

## ButtonGroup

TODO: Component description

```xml
<ButtonGroup orientation="horizontal">
  <Button variant="outline">Cancel</Button>
  <ButtonGroupText>or</ButtonGroupText>
  <Button>Save</Button>
</ButtonGroup>
```

## InputGroup

TODO: Component description

```xml
<InputGroup>
  <InputGroupAddon>
    <Icon name="search" />
  </InputGroupAddon>
  <InputGroupInput label="Handle" value="user.handle" />
  <InputGroupButton>
    Search <Icon name="arrow-right" />
  </InputGroupButton>
</InputGroup>
```

## Card

TODO: Component description

```xml
<Card>
  <CardContent>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <P>Card Content</P>
  </CardContent>
</Card>
```

## Divider

TODO: Component description

```xml
<Divider />
```

## Hero

TODO: Component description

```xml
<Hero icon="layout-grid">
  <HeroTitle>Organizations</HeroTitle>
  <HeroDescription>Browse the organizations you belong to.</HeroDescription>
  <HeroAction>
    <Action action="/organizations/new">Create organization</Action>
  </HeroAction>
</Hero>
```

## Icon

TODO: Component description

```xml
<Icon name="layout-grid" />
```

## Table

TODO: Component description

```xml
<Table>
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

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

## Action

TODO: Component description

```xml
<Action action="/issues" json='${{ title: issue.title }}'>
  Save issue
</Action>
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
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <CardAction>Card Action</CardAction>
  </CardHeader>
  <CardContent>
    <P>Card Content</P>
  </CardContent>
  <CardFooter>
    <P>Card Footer</P>
  </CardFooter>
</Card>
```

## Stack

TODO: Component description

```xml
<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>
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
  <HeroContent>
    <Action action="/organizations/new">Create organization</Action>
  </HeroContent>
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

## Tooltip

TODO: Component description

```xml
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent side="top">Tooltip text</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

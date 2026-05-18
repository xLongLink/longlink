# Components

TODO: Intoduction

## Avatar

TODO: Component description

```xml
<AvatarGroup>
  <Avatar size="sm">
    <AvatarImage src="/ada.png" alt="Ada Lovelace" />
    <AvatarFallback>AL</AvatarFallback>
    <AvatarBadge>1</AvatarBadge>
  </Avatar>
  <Avatar>
    <AvatarImage src="/grace.png" alt="Grace Hopper" />
    <AvatarFallback>GH</AvatarFallback>
  </Avatar>
  <AvatarGroupCount>+2</AvatarGroupCount>
</AvatarGroup>
```

## Badge

TODO: Component description

```xml
<Badge variant="secondary">New</Badge>
```

## Button

TODO: Component description

```xml
<Button action="/issues/new" method="GET" variant="default">
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
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <CardAction>Card Action</CardAction>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

## Stack

TODO: Component description

```xml
<Stack>
  <p>First</p>
  <p>Second</p>
</Stack>
```

## Checkbox

TODO: Component description

```xml
<Checkbox checked="settings.enabled" id="enabled" />
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
    <Button action="/organizations/new">Create organization</Button>
  </HeroContent>
</Hero>
```

## Icon

TODO: Component description

```xml
<Icon name="layout-grid" />
```

## Input

TODO: Component description

```xml
<Input label="Issue title" value="user.name" />
```

## Label

TODO: Component description

```xml
<Label htmlFor="enabled">Enabled</Label>
```

## RadioGroup

TODO: Component description

```xml
<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low">Low</RadioGroupItem>
  <RadioGroupItem value="medium">Medium</RadioGroupItem>
  <RadioGroupItem value="high">High</RadioGroupItem>
</RadioGroup>
```

## Select

TODO: Component description

```xml
<Select defaultValue="overview">
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Views</SelectLabel>
      <SelectItem value="overview">Overview</SelectItem>
      <SelectItem value="settings">Settings</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Status</SelectLabel>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="archived">Archived</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

## Slider

TODO: Component description

```xml
<Slider value="volume" min="0" max="100" step="5" />
```

## Switch

TODO: Component description

```xml
<Switch checked="settings.enabled" id="enabled" size="sm" />
```

`checked` can bind to a reactive state slot.
`defaultChecked` seeds the initial value when `checked` is not bound.
`size` accepts `sm` or `default`.

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

## Textarea

TODO: Component description

```xml
<Textarea label="Notes" value="Draft notes" rows="4" />
```

## Toggle

TODO: Component description

```xml
<Toggle pressed="settings.enabled" id="enabled" size="sm">
  Enabled
</Toggle>
```

## ToggleGroup

TODO: Component description

```xml
<ToggleGroup type="single">
  <ToggleGroupItem value="a">A</ToggleGroupItem>
  <ToggleGroupItem value="b">B</ToggleGroupItem>
  <ToggleGroupItem value="c">C</ToggleGroupItem>
</ToggleGroup>
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

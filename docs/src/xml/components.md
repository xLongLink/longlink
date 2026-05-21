# Components

Reusable UI components and bridge tags for XML pages.

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

## Text

Renders inline text content and formatting.

- `A` links to another page or resource.
- `B` renders bold inline text.
- `Code` renders inline monospace text.
- `S` renders strikethrough text.
- `Sub` renders subscript text.
- `Sup` renders superscript text.
- `P` renders a standard paragraph.
- `U` renders underlined text.

```xml
<A href="/settings" active="always">Open settings</A>
<B>Important</B>
<Code>@radix-ui/react-alert-dialog</Code>
<S>Deprecated</S>
<P>Use explicit paragraph text.</P>
<Sub>n</Sub>
<Sup>2</Sup>
<U>Underlined</U>
```

## Title

Renders page title levels.

- `H1` primary heading for a page.
- `H2` second-level heading.
- `H3` third-level heading.
- `H4` fourth-level heading.

```xml
<H1>Dashboard</H1>
<H2>Overview</H2>
<H3>Usage</H3>
<H4>Activity</H4>
```

## Lists

Renders ordered and unordered lists.

- `Ol` renders an ordered list.
- `Ul` renders an unordered list.
- `Li` renders a list item inside `Ol` or `Ul`.

```xml
<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>

<Ul>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ul>
```

## Buttons

TODO: Component description

- `Button` renders a single action.
- `ButtonGroup` arranges related buttons.

```xml
<Button variant="default">
  Create issue
</Button>

<ButtonGroup orientation="horizontal">
  <Button variant="outline">Cancel</Button>
  <ButtonGroupText>or</ButtonGroupText>
  <Button>Save</Button>
</ButtonGroup>
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

- `Divider` renders a visual separator.
- `Br` renders a line break for visual separation.

```xml
<Divider />
<Br />
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
  <Thead>
    <Tr>
      <Th>Quarter</Th>
      <Th>Revenue</Th>
      <Th>Growth</Th>
      <Th>Status</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Q1</Td>
      <Td>$120k</Td>
      <Td>12%</Td>
      <Td>On track</Td>
    </Tr>
  </Tbody>
</Table>
```

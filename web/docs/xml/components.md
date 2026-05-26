# Components

Reusable UI components and bridge tags for XML pages.

## Avatar

Avatar renders user or record imagery with fallback and badge slots.

```xml
<Avatar size="lg">
  <AvatarImage src="https://ex.com/a.png" alt="LongLink" />
  <AvatarFallback>LL</AvatarFallback>
</Avatar>
```

## Badge

Badge renders compact status or count labels.

```xml
<Flex space="around">
  <Badge>Default</Badge>
  <Badge variant="outline">Outline</Badge>
  <Badge variant="ghost">Ghost</Badge>
  <Badge variant="destructive">Alert</Badge>
  <Badge variant="link">Link</Badge>
</Flex>
```

## Buttons

Buttons trigger actions or navigation.

- `Button` renders a single action.
- `ButtonGroup` arranges related buttons.
- Supported variants include `default`, `outline`, `ghost`, `destructive`, and `link`.

```xml
<Flex space="around">
  <Button>Create issue</Button>
  <Button variant="outline">Preview</Button>
  <Button variant="ghost">Skip</Button>
  <Button variant="destructive">Delete</Button>
  <Button variant="link">Learn more</Button>
</Flex>

<Flex space="center">
  <ButtonGroup>
    <Button size="sm" variant="outline">Cancel</Button>
    <Button size="sm">Save draft</Button>
    <Button size="sm">Publish</Button>
  </ButtonGroup>
</Flex>
```

## Hr

`Hr` renders a visual separator and `Br` inserts vertical spacing.

```xml
<Hr />
<Br />
```

## Hero

Hero renders a prominent introductory section with optional actions.

```xml
<Hero icon="layout-grid">
  <HeroTitle>Browse orgs</HeroTitle>
  <HeroDescription>Manage the workspaces connected to your account.</HeroDescription>
  <HeroAction>
    <Button>New Org</Button>
  </HeroAction>
</Hero>
```

## Icon

Icon renders a Lucide icon by XML name.

```xml
<Grid columns="4">
  <Icon name="layout-grid" />
  <Icon name="search" />
  <Icon name="settings" />
  <Icon name="bell" />
  <Icon name="mail" />
  <Icon name="user" />
  <Icon name="shield" />
  <Icon name="sparkles" />
  <Icon name="camera" />
  <Icon name="calendar" />
  <Icon name="link" />
  <Icon name="arrow-right" />
  <Icon name="check" />
  <Icon name="copy" />
  <Icon name="upload" />
  <Icon name="download" />
</Grid>
```

## Input

Use `Input` inside `Field` when the input needs a label and description.

```xml
<Field>
  <FieldLabel htmlFor="name">
    <FieldTitle>Full name</FieldTitle>
    <FieldDescription>Use the name shown to other members.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Input id="name" />
  </FieldContent>
</Field>
```

## Lists

Lists render ordered and unordered lists.

- `Ol` renders an ordered list.
- `Ul` renders an unordered list.
- `Li` renders a list item inside `Ol` or `Ul`.

```xml
<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>
```

## RadioGroup

Use `RadioGroup` for mutually exclusive options and label the group clearly.

```xml
<Field>
  <FieldLegend>
    <FieldTitle>Priority</FieldTitle>
    <FieldDescription>Choose how urgently this should be handled.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <RadioGroup name="priority" defaultValue="medium">
      <RadioGroupItem value="low">Low</RadioGroupItem>
      <RadioGroupItem value="medium">Medium</RadioGroupItem>
      <RadioGroupItem value="high">High</RadioGroupItem>
    </RadioGroup>
  </FieldContent>
</Field>
```

## Select

Use `Select` for single-choice dropdowns with a title and description.

```xml
<Field>
  <FieldLabel htmlFor="department">
    <FieldTitle>Department</FieldTitle>
    <FieldDescription>Pick the team this person belongs to.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Select id="department" defaultValue="design">
      <SelectTrigger>
        <SelectValue placeholder="Choose department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="design">Design</SelectItem>
        <SelectItem value="engineering">Engineering</SelectItem>
      </SelectContent>
    </Select>
  </FieldContent>
</Field>
```

## Slider

Use `Slider` for numeric ranges and step-based input.

```xml
<Field>
  <FieldLabel htmlFor="budget">
    <FieldTitle>Budget</FieldTitle>
    <FieldDescription>Adjust the spending cap for this project.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Slider id="budget" min="0" max="100" step="5" value="50" />
  </FieldContent>
</Field>
```

## Switch

Use `Switch` for on/off settings with an explicit title and description.

```xml
<Field>
  <FieldLabel>
    <Switch id="notifications" />
    <FieldTitle>Email notifications</FieldTitle>
  </FieldLabel>
  <FieldContent>
    <FieldDescription>Get an email when someone mentions you.</FieldDescription>
  </FieldContent>
</Field>
```

## Table

Table renders structured tabular content.

```xml
<Table>
  <Thead>
    <Tr>
      <Th>Name</Th>
      <Th>Status</Th>
      <Th>Owner</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Alpha</Td>
      <Td>Active</Td>
      <Td>Sam</Td>
    </Tr>
    <Tr>
      <Td>Beta</Td>
      <Td>Paused</Td>
      <Td>Lee</Td>
    </Tr>
  </Tbody>
</Table>
```

## Text

Text renders inline text content and formatting.

- `A` links to another page or resource.
- `B` renders bold inline text.
- `Code` renders inline monospace text.
- `S` renders strikethrough text.
- `Sub` renders subscript text.
- `Sup` renders superscript text.
- `P` renders a standard paragraph.
- `U` renders underlined text.

```xml
<P>
  <A href="/settings">Open settings</A>
  <B>Important</B>
  <Code>@radix-ui/react-alert-dialog</Code>
  <S>Deprecated</S>
  <Sub>n</Sub>
  <Sup>2</Sup>
  <U>Underlined</U>
</P>
```

## Textarea

Use `Textarea` for longer text entry and keep it inside a complete field block.

```xml
<Field>
  <FieldLabel htmlFor="notes">
    <FieldTitle>Notes</FieldTitle>
    <FieldDescription>Add context for the next reviewer.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Textarea id="notes" rows="4" />
  </FieldContent>
</Field>
```

## Toggle

Use `Toggle` for a single pressed state with supporting field text.

```xml
<Field>
  <FieldLabel htmlFor="enabled">
    <FieldTitle>Enabled</FieldTitle>
    <FieldDescription>Turn this feature on for everyone.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>
  </FieldContent>
</Field>
```

## ToggleGroup

Use `ToggleGroup` for related toggle choices and show the group label above it.

```xml
<Field>
  <FieldLegend>
    <FieldTitle>Text alignment</FieldTitle>
    <FieldDescription>Choose how the content should align.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <ToggleGroup type="single">
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  </FieldContent>
</Field>
```

## Title

Title renders page title levels.

- `H1` primary heading for a page.
- `H2` second-level heading.
- `H3` third-level heading.
- `H4` fourth-level heading.

```xml
<H1>Dashboard</H1>
```

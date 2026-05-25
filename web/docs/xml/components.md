# Components

Reusable UI components and bridge tags for XML pages.

## Avatar

Avatar renders user or record imagery with fallback and badge slots.

```xml
<Avatar size="sm"><AvatarImage /><AvatarFallback>AL</AvatarFallback></Avatar>
```

## Badge

Badge renders compact status or count labels.

```xml
<Badge>New</Badge>
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

## Title

Title renders page title levels.

- `H1` primary heading for a page.
- `H2` second-level heading.
- `H3` third-level heading.
- `H4` fourth-level heading.

```xml
<H1>Dashboard</H1>
```

## Lists

Lists render ordered and unordered lists.

- `Ol` renders an ordered list.
- `Ul` renders an unordered list.
- `Li` renders a list item inside `Ol` or `Ul`.

```xml
<Ol><Li>First item</Li><Li>Second item</Li></Ol>
```

## Buttons

Buttons trigger actions or navigation.

- `Button` renders a single action.
- `ButtonGroup` arranges related buttons.

```xml
<Button>Create issue</Button>
```

## Hr

`Hr` renders a visual separator and `Br` inserts vertical spacing.

```xml
<Hr /><Br />
```

## Hero

Hero renders a prominent introductory section with optional actions.

```xml
<Hero icon="layout-grid">Browse orgs</Hero>
```

## Icon

Icon renders a Lucide icon by XML name.

```xml
<Icon name="layout-grid" />
```

## Table

Table renders structured tabular content.

```xml
<Table><Thead /><Tbody /></Table>
```

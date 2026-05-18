# HTML

LongLink exposes a small HTML bridge layer for common formatting, layout, and link content inside XML pages.

These tags share the same conditional rendering model through the global `if` attribute.

## `A`

Links to another page or resource.

- `href` required. Link target.

```xml
<A href="/settings">Open settings</A>
```

## `B`

Renders bold inline text.

```xml
<B>Important</B>
```

## `Br`

Renders a line break for visual separation.

```xml
<Br />
```

## `Code`

Renders inline monospace text.

```xml
<Code>@radix-ui/react-alert-dialog</Code>
```

## `H1`

Renders the primary heading for a page.

```xml
<H1>Dashboard</H1>
```

## `H2`

Renders the second-level heading.

```xml
<H2>Overview</H2>
```

## `H3`

Renders the third-level heading.

```xml
<H3>Usage</H3>
```

## `H4`

Renders the fourth-level heading.

```xml
<H4>Activity</H4>
```

## `Li`

Renders a list item inside `ul` or `ol`.

```xml
<Ul>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ul>
```

## `Ol`

Renders an ordered list.

```xml
<Ol>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ol>
```

## `P`

Renders a standard paragraph.

- No attributes.

```xml
<P>Use explicit paragraph text.</P>
```

## `S`

Renders strikethrough text.

```xml
<S>Deprecated</S>
```

## `Sub`

Renders subscript text.

```xml
<Sub>n</Sub>
```

## `Sup`

Renders superscript text.

```xml
<Sup>2</Sup>
```

## `U`

Renders underlined text.

```xml
<U>Underlined</U>
```

## `Ul`

Renders an unordered list.

```xml
<Ul>
  <Li>First item</Li>
  <Li>Second item</Li>
</Ul>
```

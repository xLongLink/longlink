# HTML

LongLink exposes a small HTML bridge layer for common formatting, layout, and link content inside XML pages.

These tags share the same conditional rendering model through the global `if` attribute.

## `a`

Links to another page or resource.

- `href` required. Link target.

```xml
<a href="/settings">Open settings</a>
```

## `b`

Renders bold inline text.

```xml
<b>Important</b>
```

## `br`

Renders a spacer block for visual separation.

```xml
<br />
```

## `code`

Renders inline monospace text.

```xml
<code>@radix-ui/react-alert-dialog</code>
```

## `h1`

Renders the primary heading for a page.

```xml
<h1>Dashboard</h1>
```

## `h2`

Renders the second-level heading.

```xml
<h2>Overview</h2>
```

## `h3`

Renders the third-level heading.

```xml
<h3>Usage</h3>
```

## `h4`

Renders the fourth-level heading.

```xml
<h4>Activity</h4>
```

## `li`

Renders a list item inside `ul` or `ol`.

```xml
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

## `ol`

Renders an ordered list.

```xml
<ol>
  <li>First item</li>
  <li>Second item</li>
</ol>
```

## `p`

Renders a standard paragraph.

- None.

```xml
<p>Use explicit paragraph text.</p>
```

## `s`

Renders strikethrough text.

```xml
<s>Deprecated</s>
```

## `sub`

Renders subscript text.

```xml
<sub>n</sub>
```

## `sup`

Renders superscript text.

```xml
<sup>2</sup>
```

## `u`

Renders underlined text.

```xml
<u>Underlined</u>
```

## `ul`

Renders an unordered list.

```xml
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

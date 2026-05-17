# HTML

The lowercase HTML bridge elements exposed in XML pages are `p`, `a`, `hr`, `b`, `h1`, `h2`, `h3`, `h4`, `code`, `s`, `sup`, `sub`, `u`, `ul`, and `li`.

All of these tags accept `className`.
All of these tags support the global `if` attribute.

## `p`

Use `p` for paragraph text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders as a normal HTML paragraph.

Example:

```xml
<p>Use explicit paragraph text.</p>
```

## `a`

Use `a` for standard links.

Attributes:

- `href` required. Link target.
- `className` optional. Extra classes for styling.

Behavior:

- Renders as a normal HTML anchor.

Example:

```xml
<a href="/settings" className="link">Open settings</a>
```

## `hr`

Use `hr` for a horizontal separator.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML horizontal rule.

Example:

```xml
<hr />
```

## `b`

Use `b` for bold text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML bold element.

Example:

```xml
<b>Important</b>
```

## `h1`

Use `h1` for the page title.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a primary heading.

Example:

```xml
<h1>Dashboard</h1>
```

## `h2`

Use `h2` for the next heading level.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a secondary heading.

Example:

```xml
<h2>Overview</h2>
```

## `h3`

Use `h3` for section headings.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a tertiary heading.

Example:

```xml
<h3>Usage</h3>
```

## `h4`

Use `h4` for small subsection headings.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a quaternary heading.

Example:

```xml
<h4>Activity</h4>
```

## `code`

Use `code` for inline code text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders inline monospace text.

Example:

```xml
<code>@radix-ui/react-alert-dialog</code>
```

## `s`

Use `s` for strikethrough text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML strikethrough element.

Example:

```xml
<s>Deprecated</s>
```

## `sup`

Use `sup` for superscript text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML superscript element.

Example:

```xml
<sup>2</sup>
```

## `sub`

Use `sub` for subscript text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML subscript element.

Example:

```xml
<sub>n</sub>
```

## `u`

Use `u` for underlined text.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML underline element.

Example:

```xml
<u>Underlined</u>
```

## `ul`

Use `ul` for unordered lists.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML unordered list.

Example:

```xml
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

## `li`

Use `li` for list items inside `ul`.

Attributes:

- `className` optional. Extra classes for styling.

Behavior:

- Renders a normal HTML list item.

Example:

```xml
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

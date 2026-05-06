# Components

Components are the interactive building blocks of XML pages.
They cover text output, inputs, actions, and icons.
Use them when the page needs direct user interaction or data display.
The sections below describe each component and how it is used.

## Text

Use `<Text>` when you need an explicit text node rendered from an expression.

```xml
<Text value="{user.name}" />
```

## Button

Use `<Button>` for actions.

```xml
<Button action="/issues/new" method="GET" variant="default">Create issue</Button>
```

## Icon

Use `<Icon>` for a standalone icon.

```xml
<Icon name="bug" />
```

## Input

Use `<Input>` for plain single-line text entry.

```xml
<Input value="user.name" placeholder="Issue title" />
```

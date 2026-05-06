# Components

Components are the interactive building blocks of XML pages.
They cover inputs, actions, and icons.
Use them when the page needs direct user interaction or data display.
The sections below describe each component and how it is used.

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

Use `<Input>` for single-line text entry.

```xml
<Input name="title" label="Title" placeholder="Issue title" />
```

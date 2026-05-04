# Components

Components are the interactive building blocks of XML pages.
They cover inputs, actions, dialogs, icons, and other user-facing controls.
Use them when the page needs direct user interaction.
The sections below describe each component and how it is used.

## Hero

Use `<Hero>` for the top section of a page. Place it near the top, use `title` and `subtitle` to describe the page clearly, and place right-side actions as children.

```xml
<Page name="Issues" icon="bug">
  <Hero
    title="Issues"
    subtitle="Track and manage open work."
    icon="bug"
  >
    <Button text="Create issue" url="/issues/new" />
  </Hero>
</Page>
```

## Button

Use `<Button>` for actions and navigation targets.

```xml
<Button text="Create issue" url="/issues/new" variant="default" />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Checkbox

Use `<Checkbox>` for boolean input.

```xml
<Checkbox label="Notify the team" description="Send an update." checked="true" />
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

## Select

Use `<Select>` to choose one option from a list.

```xml
<Select label="Status" options='[{"label":"Draft","value":"draft"}]' />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Separator

Use `<Separator>` to divide blocks.

```xml
<Input name="title" label="Title" />
<Separator />
<Textarea label="Details" />
```

## Slider

Use `<Slider>` for numeric input with one or two thumbs.

```xml
<Slider label="Progress" min="0" max="100" step="5" value="35" />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Range

Use `<Range>` only for legacy pages that still rely on the older range element.
Prefer `<Slider>` for new pages.

```xml
<Range label="Budget" min="0" max="100" step="10" value="[20,80]" />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Switch

Use `<Switch>` for a compact boolean toggle.

```xml
<Switch label="Enable notifications" active="true" />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Textarea

Use `<Textarea>` for multiline text input.

```xml
<Textarea label="Description" placeholder="Write the issue details" />
```

Actionable elements accept `action`, `method`, `url`, and `payload`.

## Table

Use `<Table>` to render tabular data.

```xml
<Table data='[{"name":"Projects","status":"Active"}]'>
  <Column key="name" label="Name" content="{name}" />
  <Column key="status" label="Status" content="{status}" />
</Table>
```

Use `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, and `<TableCell>` together to build fully explicit table markup when needed.

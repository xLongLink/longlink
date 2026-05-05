# Components

Components are the interactive building blocks of XML pages.
They cover inputs, actions, dialogs, icons, tables, and other user-facing controls.
Use them when the page needs direct user interaction or data display.
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
    <Button action="/issues/new" method="GET">Create issue</Button>
  </Hero>
</Page>
```

## Button

Use `<Button>` for actions.

```xml
<Button action="/issues/new" method="GET" variant="default">Create issue</Button>
```

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

Use `submit` when the field should POST its value on blur or commit.

```xml
<Input name="title" label="Title" submit="/issues" />
```

## Select

Use `<Select>` to choose one option from a list.

```xml
<Select label="Status" options='[{"label":"Draft","value":"draft"}]' />
```

Use `submit` to pair the dropdown with an inline submit button.

```xml
<Select
  label="Status"
  options='[{"label":"Draft","value":"draft"}]'
  submit="Save"
/>
```

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

## Range

Use `<Range>` for two-handle numeric selection.

```xml
<Range label="Budget" min="0" max="100" step="10" value="[20,80]" />
```

## Switch

Use `<Switch>` for a compact boolean toggle. Use `checked` for the current value, or `active` when you are matching older XML pages.

```xml
<Switch label="Enable notifications" checked="true" />
```

## Textarea

Use `<Textarea>` for multiline text input.

```xml
<Textarea label="Description" placeholder="Write the issue details" />
```

## Table

Use `<Table>` together with `<TableHeader>`, `<TableBody>`, `<TableFooter>`, `<TableRow>`, `<TableHead>`, and `<TableCell>` to render tabular data. Use `<TableFooter>` for footer rows and `<TableBody>` for the main data rows.

```xml
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Projects</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell>Total</TableCell>
      <TableCell>1</TableCell>
    </TableRow>
  </TableFooter>
</Table>
```

# Components

Components are the interactive building blocks of XML pages.
They cover inputs, actions, dialogs, icons, and other user-facing controls.
Use them when the page needs direct user interaction.
The sections below describe each component and how it is used.

## Button

Use `<Button>` for page actions.

```xml
<Button text="Create issue" url="/issues/new" variant="default" />
```

- Use `text` for the label.
- Use `url` for the action target.
- Use `variant` to change visual emphasis.

## Checkbox

Use `<Checkbox>` for boolean input with a label.

```xml
<Checkbox
  label="Notify the team"
  description="Send an update when the issue changes."
  checked="true"
/>
```

## Icon

Use `<Icon>` when a page needs a standalone icon element.

```xml
<Icon name="bug" />
```

- Use icon names that exist in the current web icon set.
- Many layout elements also accept an `icon` prop directly.

## Input

Use `<Input>` for single-line text input.

```xml
<Input
  name="title"
  label="Title"
  placeholder="Issue title"
  description="Short summary of the issue."
/>
```

## Range

`<Range>` is the legacy slider component.

```xml
<Range
  label="Budget range"
  description="Legacy range control."
  min="0"
  max="100"
  step="10"
  value="[20,80]"
/>
```

- Use it only when the page still depends on the older prop model.
- Use `<Slider>` for the current runtime slider element.

## Select

Use `<Select>` to choose one option from a list.

```xml
<Select
  label="Status"
  placeholder="Choose a status"
  options='[{"label":"Draft","value":"draft"},{"label":"Active","value":"active"}]'
/>
```

## Separator

Use `<Separator>` to add visual separation between blocks.

```xml
<Input name="title" label="Title" />
<Separator />
<Textarea label="Details" />
```

## Slider

Use `<Slider>` for the current runtime slider component.

```xml
<Slider
  label="Progress"
  description="Current progress value."
  min="0"
  max="100"
  step="5"
  value="35"
/>
```

```xml
<Slider
  label="Budget"
  description="Selected range."
  min="0"
  max="100"
  step="10"
  value="[20,80]"
/>
```

- Use `value="35"` for a single thumb.
- Use `value="[20,80]"` for a range.
- The renderer also supports `orientation` and `disabled`.

## Switch

Use `<Switch>` for a compact boolean toggle.

```xml
<Switch
  label="Enable notifications"
  description="Turn updates on or off."
  active="true"
/>
```

## Textarea

Use `<Textarea>` for multiline text input.

```xml
<Textarea
  label="Description"
  placeholder="Write the issue details"
  description="Use multiple lines when needed."
/>
```

## Table

Use `<Table>` to present structured data in rows and columns. Use explicit markup when the page controls every cell directly, and use `<Column>` definitions when table rows come from the `data` prop.

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
</Table>
```

```xml
<Table data='[{"name":"Projects","status":"Active"}]'>
  <Column key="name" label="Name" content="{name}" />
  <Column key="status" label="Status" content="{status}" />
</Table>
```

## Table data

Use `<Table>` for structured rows and columns. The runtime also supports a `data` prop that renders one row per item and injects the current item into scope.

```xml
<Table data='[{"name":"Projects","status":"Active"}]'>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>{name}</TableCell>
      <TableCell>{status}</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

The current runtime registry does not expose a separate `<DataTable>` component.

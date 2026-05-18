# Field

LongLink `Field` components compose accessible form rows, helper text, and validation states.

Use `FieldSet` for semantic grouping, `FieldGroup` for stacked fields, and `FieldSeparator` to divide related sections.
Use `Field` for one control row, `FieldContent` when the label and control need separate alignment, and `FieldError` for validation messages.

## Compatible Components

These controls work inside the `Field` family:

- `Input`
- `Textarea`
- `Select`
- `Slider`
- `Checkbox`
- `RadioGroup`
- `Switch`

Use `FieldLabel` with these controls to connect the visible label to the input.
Use `FieldDescription` for helper text.
Use `FieldTitle` when the label slot needs title styling.

## Usage

```xml
<FieldSet>
  <FieldLegend>Profile</FieldLegend>
  <FieldDescription>This appears on invoices and emails.</FieldDescription>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="name">Full name</FieldLabel>
      <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
      <FieldDescription>This appears on invoices and emails.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input id="username" autoComplete="off" aria-invalid />
      <FieldError>Choose another username.</FieldError>
    </Field>
    <Field orientation="horizontal">
      <Switch id="newsletter" />
      <FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel>
    </Field>
  </FieldGroup>
</FieldSet>
```

## Components

### `FieldSet`

Renders a semantic field group container.

### `FieldLegend`

Renders the legend for a `FieldSet`.

`variant` accepts `legend` or `label`.

### `FieldGroup`

Stacks related `Field` rows.

### `Field`

Renders one field row.

`orientation` accepts `vertical`, `horizontal`, or `responsive`.

### `FieldContent`

Groups the control, description, and error content.

### `FieldLabel`

Renders the label slot for a field.

`htmlFor` points at the control id.

### `FieldTitle`

Renders title-styled field text.

### `FieldDescription`

Renders helper text for a field.

### `FieldSeparator`

Renders a visual divider between field sections.

### `FieldError`

Renders validation messages.

`errors` accepts an array of validation errors or a string.

# Field

Field components group labels, inputs, controls, and validation text into a single form layout.

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

## Input

TODO: Component description

```xml
<Field>
  <FieldLabel htmlFor="name">Full name</FieldLabel>
  <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
  <FieldDescription>This appears on invoices and emails.</FieldDescription>
</Field>
```

## Textarea

TODO: Component description

```xml
<Field>
  <FieldLabel htmlFor="notes">Notes</FieldLabel>
  <Textarea id="notes" rows="4" placeholder="Add notes here" />
  <FieldDescription>Keep the note short and clear.</FieldDescription>
</Field>
```

## Select

TODO: Component description

```xml
<Field>
  <FieldLabel htmlFor="department">Department</FieldLabel>
  <Select id="department" defaultValue="design">
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="design">Design</SelectItem>
      <SelectItem value="engineering">Engineering</SelectItem>
    </SelectContent>
  </Select>
  <FieldDescription>Select the team this user belongs to.</FieldDescription>
</Field>
```

## Slider

TODO: Component description

```xml
<Field>
  <FieldLabel htmlFor="budget">Budget</FieldLabel>
  <Slider id="budget" min="0" max="100" step="5" value="50" />
  <FieldDescription>Set the allowed budget range.</FieldDescription>
</Field>
```

## Checkbox

TODO: Component description

```xml
<Field orientation="horizontal">
  <Checkbox id="newsletter" />
  <FieldLabel htmlFor="newsletter">Subscribe to the newsletter</FieldLabel>
</Field>
```

## RadioGroup

TODO: Component description

```xml
<Field>
  <FieldLabel>Priority</FieldLabel>
  <RadioGroup name="priority" defaultValue="medium">
    <RadioGroupItem value="low">Low</RadioGroupItem>
    <RadioGroupItem value="medium">Medium</RadioGroupItem>
    <RadioGroupItem value="high">High</RadioGroupItem>
  </RadioGroup>
  <FieldDescription>Choose the default handling priority.</FieldDescription>
</Field>
```

## Switch

TODO: Component description

```xml
<Field orientation="horizontal">
  <Switch id="notifications" />
  <FieldLabel htmlFor="notifications">Enable notifications</FieldLabel>
</Field>
```

## Toggle

TODO: Component description

```xml
<Field orientation="horizontal">
  <Toggle pressed="settings.enabled" id="enabled" size="sm">
    Enabled
  </Toggle>
  <FieldLabel htmlFor="enabled">Enabled</FieldLabel>
</Field>
```

## ToggleGroup

TODO: Component description

```xml
<Field>
  <FieldLabel>Mode</FieldLabel>
  <ToggleGroup type="single">
    <ToggleGroupItem value="a">A</ToggleGroupItem>
    <ToggleGroupItem value="b">B</ToggleGroupItem>
    <ToggleGroupItem value="c">C</ToggleGroupItem>
  </ToggleGroup>
</Field>
```

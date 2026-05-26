# Field

Field components group labels, titles, descriptions, controls, and validation text into a single form layout.

## Field Building Blocks

Use `FieldLegend`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, and `FieldError` to build complete form sections.

```xml
<FieldLegend>
  <FieldTitle>Profile</FieldTitle>
  <FieldDescription>Update the details shown on your account.</FieldDescription>
</FieldLegend>

<FieldSeparator>Account details</FieldSeparator>

<FieldError>Display name is required.</FieldError>
```

## Input

Use `Input` inside `Field` when the input needs a label, description, and validation message.

```xml
<Field>
  <FieldLabel htmlFor="name">
    <FieldTitle>Full name</FieldTitle>
    <FieldDescription>Use the name shown to other members.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Input id="name" />
    <FieldError>Full name is required.</FieldError>
  </FieldContent>
</Field>
```

## Textarea

Use `Textarea` for longer text entry and keep it inside a complete field block.

```xml
<Field>
  <FieldLabel htmlFor="notes">
    <FieldTitle>Notes</FieldTitle>
    <FieldDescription>Add context for the next reviewer.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Textarea id="notes" rows="4" />
  </FieldContent>
</Field>
```

## Select

Use `Select` for single-choice dropdowns with a title and description.

```xml
<Field>
  <FieldLabel htmlFor="department">
    <FieldTitle>Department</FieldTitle>
    <FieldDescription>Pick the team this person belongs to.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Select id="department" defaultValue="design">
      <SelectTrigger>
        <SelectValue placeholder="Choose department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="design">Design</SelectItem>
        <SelectItem value="engineering">Engineering</SelectItem>
      </SelectContent>
    </Select>
  </FieldContent>
</Field>
```

## Slider

Use `Slider` for numeric ranges and step-based input.

```xml
<Field>
  <FieldLabel htmlFor="budget">
    <FieldTitle>Budget</FieldTitle>
    <FieldDescription>Adjust the spending cap for this project.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Slider id="budget" min="0" max="100" step="5" value="50" />
  </FieldContent>
</Field>
```

## Checkbox

Use `Checkbox` for boolean choices with supporting copy.

```xml
<Field orientation="horizontal">
  <Checkbox id="newsletter" defaultChecked="true" />
  <FieldLabel htmlFor="newsletter">Newsletter</FieldLabel>
</Field>
```

## RadioGroup

Use `RadioGroup` for mutually exclusive options and label the group clearly.

```xml
<Field>
  <FieldLegend>
    <FieldTitle>Priority</FieldTitle>
    <FieldDescription>Choose how urgently this should be handled.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <RadioGroup name="priority" defaultValue="medium">
      <RadioGroupItem value="low">Low</RadioGroupItem>
      <RadioGroupItem value="medium">Medium</RadioGroupItem>
      <RadioGroupItem value="high">High</RadioGroupItem>
    </RadioGroup>
  </FieldContent>
</Field>
```

## Switch

Use `Switch` for on/off settings with an explicit title and description.

```xml
<Field>
  <FieldLabel>
    <Switch id="notifications" />
    <FieldTitle>Email notifications</FieldTitle>
  </FieldLabel>
  <FieldContent>
    <FieldDescription>Get an email when someone mentions you.</FieldDescription>
  </FieldContent>
</Field>
```

## Toggle

Use `Toggle` for a single pressed state with supporting field text.

```xml
<Field>
  <FieldLabel htmlFor="enabled">
    <FieldTitle>Enabled</FieldTitle>
    <FieldDescription>Turn this feature on for everyone.</FieldDescription>
  </FieldLabel>
  <FieldContent>
    <Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>
  </FieldContent>
</Field>
```

## ToggleGroup

Use `ToggleGroup` for related toggle choices and show the group label above it.

```xml
<Field>
  <FieldLegend>
    <FieldTitle>Text alignment</FieldTitle>
    <FieldDescription>Choose how the content should align.</FieldDescription>
  </FieldLegend>
  <FieldContent>
    <ToggleGroup type="single">
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  </FieldContent>
</Field>
```

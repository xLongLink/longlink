# Field

Field components group labels, inputs, controls, and validation text into a single form layout.

```xml
<Field><FieldLabel>Full name</FieldLabel><Input /></Field>
```

## Input

Use `InputGroup` when the input needs an icon, addon, or action button.

```xml
<Input id="name" />
```

## Textarea

Use `Textarea` for longer text entry.

```xml
<Textarea id="notes" rows="4" />
```

## Select

Use `Select` for single-choice dropdowns.

```xml
<Select id="department" defaultValue="design">
  <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="design">Design</SelectItem>
    <SelectItem value="engineering">Engineering</SelectItem>
  </SelectContent>
</Select>
```

## Slider

Use `Slider` for numeric ranges and step-based input.

```xml
<Slider id="budget" min="0" max="100" step="5" value="50" />
```

## Checkbox

Use `Checkbox` for boolean choices.

```xml
<Checkbox id="newsletter" />
```

## RadioGroup

Use `RadioGroup` for mutually exclusive options.

```xml
<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low">Low</RadioGroupItem>
  <RadioGroupItem value="medium">Medium</RadioGroupItem>
  <RadioGroupItem value="high">High</RadioGroupItem>
</RadioGroup>
```

## Switch

Use `Switch` for on/off settings.

```xml
<Switch id="notifications" />
```

## Toggle

Use `Toggle` for a single pressed state.

```xml
<Toggle pressed="settings.enabled" id="enabled" size="sm">Enabled</Toggle>
```

## ToggleGroup

Use `ToggleGroup` for related toggle choices.

```xml
<ToggleGroup type="single">
  <ToggleGroupItem value="left">Left</ToggleGroupItem>
  <ToggleGroupItem value="center">Center</ToggleGroupItem>
  <ToggleGroupItem value="right">Right</ToggleGroupItem>
</ToggleGroup>
```

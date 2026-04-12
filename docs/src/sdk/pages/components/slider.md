# Slider

Use `<Slider>` for the current runtime slider component.

The slider supports a single value or a range value.

## Single-value example

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

## Range example

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

## Notes

- Use `value="35"` for a single thumb.
- Use `value="[20,80]"` for a range.
- The renderer also supports `orientation` and `disabled`.

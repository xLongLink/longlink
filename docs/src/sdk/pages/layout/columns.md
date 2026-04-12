# Columns

Use `<Columns>` and `<Column>` to create multi-column layouts.

The renderer supports both the current `span` model and the older `width` model.

## Example

```xml
<Columns gap="16">
  <Column span="8">
    <Card>
      <CardContent>
        <p>Main content</p>
      </CardContent>
    </Card>
  </Column>

  <Column span="4">
    <Card>
      <CardContent>
        <p>Secondary content</p>
      </CardContent>
    </Card>
  </Column>
</Columns>
```

## Notes

- Use `gap` on `<Columns>` to control spacing.
- Use `span` for the current layout model.
- Legacy `widths` and `width` values are still supported by the renderer.

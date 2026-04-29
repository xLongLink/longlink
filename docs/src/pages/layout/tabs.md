# Tabs

Use tabs when the page needs multiple related views in the same section.

The tabs model is explicit and uses separate list, trigger, and content elements.

## Supported elements

- `<Tabs>`
- `<TabsList>`
- `<TabsTrigger>`
- `<TabsContent>`

## Example

```xml
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    <Card>
      <CardContent>
        <p>Details content</p>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="activity">
    <Card>
      <CardContent>
        <p>Activity content</p>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

## Notes

- `value` must match between `<TabsTrigger>` and `<TabsContent>`.
- `defaultValue` selects the initially visible tab.

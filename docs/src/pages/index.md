# Pages

A page is the UI contract for one application view.
Each page is defined in one XML file.
LongLink renders this file in the web client.

## How a page is structured

A page usually has three layers:

1. **Page root**
   The XML root contains layout and content elements.
2. **Layout blocks**
   Layout elements such as `<Hero>`, `<Card>`, `<Columns>`, `<Tabs>`, and `<Table>` organize screen structure. See [Layout components](./layout).
3. **Content and interaction blocks**
   HTML elements (`<h1>`, `<p>`, `<ul>`), UI components (`<Button>`, `<Input>`, `<Select>`), and special XML components such as `<If>`, `<For>`, and `<State>` provide text, control flow, and user actions. See [Components](./components).

   Use `<If>` to show a block only when a condition is true:

   ```xml
   <If condition="isReady">
     <Button>Continue</Button>
   </If>
   ```

   Use `<For>` to repeat content for each item in a list:

   ```xml
   <For each="order in orders">
     <Card>{order.number}</Card>
   </For>
   ```

   Use `<State>` to bind local page state:

   ```xml
   <State name="isOpen" value="false" />
   ```

This separation keeps each page explicit, composable, and easy to maintain.

## Minimal example

```xml
<Hero title="Orders" subtitle="Track order status and actions">
  <Card>
    <CardHeader>
      <CardTitle>Recent orders</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Select an order to view details.</p>
      <Button>Open order</Button>
    </CardContent>
  </Card>
</Hero>
```

## Recommended page flow

Use this sequence when building a page:

1. Define the main goal of the view.
2. Pick layout components that match this goal.
3. Add text using HTML elements for clear structure.
4. Add interactive components for user input and actions.
5. Split complex content into tabs or sections when needed.

## Related references

- [Layout components](./layout)
- [Components](./components)
- [HTML elements](./html-elements)

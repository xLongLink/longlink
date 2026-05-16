# Components

Components handle visible content and user actions.
Use them when a page needs navigation or form input.

## Button

Use the `Button` component to trigger an action or navigate to a route.

```xml
<Button action="/issues/new" method="GET" variant="default">
  Create issue
</Button>
```

`action` sends a request to the configured path.
`href` turns the button into a navigation link.
`json` is evaluated at click time.
`invalidate` accepts a list of slot ids to rerun after success.

## Input

Use the `Input` component for single-line text entry.

```xml
<Input value="user.name" placeholder="Issue title" />
```

When `value` resolves to a reactive state object, the input stays in sync and writes back to `state.value`.
Otherwise, `value` initializes the field.

## Divider

Use the `Divider` component to separate sections with a horizontal rule.

```xml
<Divider />
```

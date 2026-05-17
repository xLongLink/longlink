# Components

Components handle visible content and user actions.
Use them when a page needs navigation or form input.

## Hero

Use the `Hero` shell for page headers with title, description, and action content.
`HeroContent` renders in a separate right-side slot.
All other children render in the main hero body.

```xml
<Hero icon="layout-grid">
  <HeroTitle>Organizations</HeroTitle>
  <HeroDescription>Browse the organizations you belong to.</HeroDescription>
  <HeroContent>
    <Button action="/organizations/new">Create organization</Button>
  </HeroContent>
</Hero>
```

`HeroTitle`, `HeroDescription`, and `HeroContent` are the three supported hero slots.

## Card

Use the `Card` component for grouped content blocks and simple dashboard panels.

```xml
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
    <CardAction>Card Action</CardAction>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

`CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` compose the shadcn card layout.
`size="sm"` keeps the compact card density.
Each card part also accepts `className` for local styling.

## Button

Use the `Button` component to navigate or trigger an action.

```xml
<Button action="/issues/new" method="GET" variant="default">
  Create issue
</Button>
```

`action` is the target path.
`method="GET"` renders a navigation link to `action`.
`method="POST"`, `PUT`, and `DELETE` send a data-changing request to `action`.
If `action` is empty, the button only runs invalidation.
`json` is evaluated at click time.
`invalidate` accepts an array expression of slot ids to rerun after success.

## Input

Use the `Input` component for single-line text entry.

```xml
<Input value="user.name" placeholder="Issue title" />
```

When `value` resolves to a reactive Valtio-backed state slot, the input stays in sync and writes back to `state.value`.
Otherwise, `value` only initializes the field.

## Divider

Use the `Divider` component to separate sections with a horizontal rule.

```xml
<Divider />
```

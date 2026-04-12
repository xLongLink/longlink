# Card

Use cards to group related content into clear sections.

The renderer supports a composed card structure based on explicit child tags.

## Supported elements

- `<Card>`
- `<CardHeader>`
- `<CardTitle>`
- `<CardDescription>`
- `<CardAction>`
- `<CardContent>`
- `<CardFooter>`

## Example

```xml
<Card>
  <CardHeader>
    <CardTitle>Deployment status</CardTitle>
    <CardDescription>Current state of the application.</CardDescription>
    <CardAction>
      <Button text="Refresh" url="/deployments" variant="outline" />
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>The application is running.</p>
  </CardContent>
  <CardFooter>
    <p>Last updated 2 minutes ago.</p>
  </CardFooter>
</Card>
```

## Notes

- Use `<CardHeader>` for metadata and actions.
- Use `<CardContent>` for the main body.
- Use `<CardFooter>` for secondary details.

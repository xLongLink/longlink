# Hero

Use `<Hero>` to define the top section of a page.

The hero usually introduces the page and can also include a primary action.

## Example

```xml
<Page name="Issues" icon="bug">
  <Hero
    title="Issues"
    subtitle="Track and manage open work."
    icon="bug"
  >
    <Button text="Create issue" url="/issues/new" />
  </Hero>
</Page>
```

## Notes

- Place `<Hero>` near the top of the page.
- Use `title` and `subtitle` to describe the page clearly.
- Place actions such as `<Button>` inside the hero body.

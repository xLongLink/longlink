# Menu

Use `<Menu>` to organize page content into navigable sections.

The current menu model uses `<MenuSection>` and `<MenuSubSection>` to group content.

## Example

```xml
<Menu>
  <MenuSection title="Overview" icon="layout-dashboard">
    <MenuSubSection title="" root="true">
      <Card>
        <CardContent>
          <p>Overview content</p>
        </CardContent>
      </Card>
    </MenuSubSection>
  </MenuSection>

  <MenuSection title="Settings" icon="settings">
    <MenuSubSection title="General">
      <Card>
        <CardContent>
          <p>Settings content</p>
        </CardContent>
      </Card>
    </MenuSubSection>
  </MenuSection>
</Menu>
```

## Notes

- Use `<MenuSection>` for top-level navigation entries.
- Use `<MenuSubSection>` for the content shown within a section.
- Set `root="true"` when a subsection should render as the section root.

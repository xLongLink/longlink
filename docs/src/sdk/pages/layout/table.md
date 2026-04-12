# Table

Use tables to present structured data in rows and columns.

The renderer supports both explicit table markup and the higher-level data table pattern with `<Column>` definitions.

## Native table markup

```xml
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Projects</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Data table example

```xml
<Table data='[{"name":"Projects","status":"Active"}]'>
  <Column key="name" label="Name" content="{name}" />
  <Column key="status" label="Status" content="{status}" />
</Table>
```

## Notes

- Use explicit markup when the page controls every cell directly.
- Use `<Column>` definitions when table rows come from the `data` prop.

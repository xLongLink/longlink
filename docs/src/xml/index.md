# XML Pages

LongLink XML pages define the user interface for backoffice applications, admin panels, and internal tools.
The runtime parses each `.xml` file, resolves expressions, and renders the supported tags as React components.

Use XML pages for CRUD screens, forms, tables, dashboards, and operational workflows.

## Page Loading

```python
from longlink import LongLink

app = LongLink(env=env)
app.include_page("/pages")
```

Pages are loaded from nested `*.xml` files under the registered folder.
For example, `pages/dashboard/overview.xml` is available at `/pages/dashboard/overview.xml`.

## Root Element

Every page starts with the `Page` root element.
It defines the page shell and page metadata.

```xml
<Page name="Tab Name" icon="settings">
  <p>Hello</p>
</Page>
```

Use only the elements and attributes documented in this section and in `sdk/longlink/.static/llm/SCHEMA.md`.

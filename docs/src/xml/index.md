# XML Pages

LongLink XML pages define the user interface for backoffice applications, admin panels, and internal tools.
The runtime parses each `.xml` file, resolves expressions, and renders the supported tags as React components.

Use XML pages for CRUD screens, forms, tables, dashboards, and operational workflows.

## Document Loading

```python
from longlink import LongLink, page

app = LongLink(env=env)


@page("/pages/dashboard/overview.xml")
def dashboard_page():
    return None
```

Pages are declared directly with the `page` decorator.
The `url` points at the XML page path.

See `sdk/longlink/.static/llm/SCHEMA.md` for the XML authoring reference.
See `components.md` for the component surface.

## Context

`useXmlContext` reads the active XML runtime state from React context.
`ContextProvider` exposes a runtime context to rendered XML children.
`createContext` returns a blank execution context.
`setupContext` walks the AST, seeds `State` and `Query` nodes, and stores their re-run hooks for invalidation.

### Conditional Rendering

Use `if="..."` on any documented XML element to skip rendering when the expression is false.

```xml
<p if="{order.active}">Active</p>
```

### Expressions

Use brace expressions in text nodes and attribute values to read runtime values.

```xml
<p>Hello, {user.name}</p>
```

Use `$name` for direct references.
Use `{count + 1}` for wrapped expressions that return typed values.
Use `\{\{ fullName: fullName \}\}` for object payloads in `json` attributes.
Use mixed text interpolation like `Hello {name}` when plain text and runtime values need to share a string.

Supported expressions are literals, dotted lookups, arrays, objects, template literals, and basic arithmetic.
Unsupported expressions include statements, function calls, assignments, comparisons, logical operators, ternaries, optional chaining, and globals.

Use only the elements and attributes documented in this page and in `sdk/longlink/.static/llm/SCHEMA.md`.

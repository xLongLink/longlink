# XML Pages

LongLink XML pages define the user interface for backoffice applications, admin panels, and internal tools.
The runtime parses each `.xml` file, resolves expressions, and renders the supported tags as React components.

Use XML pages for CRUD screens, forms, tables, dashboards, and operational workflows.

## Core Model

Every XML document starts with a `<longlink>` root element.
Use `<State>` for local reactive state slots, `<Query>` for JSON fetch slots, and `<For>` to render arrays in a child scope.
Use `Input`, `Textarea`, `Select`, `RadioGroup`, `Toggle`, `Checkbox`, `Switch`, and `Slider` for form controls.
Use `Button`, `Badge`, `Divider`, `Icon`, `Hero`, `Card`, `Dialog`, `Tooltip`, `Avatar`, `Columns`, `Table`, `Tabs`, `Field`, `Label`, `p`, and `a` for the rest of the documented surface.

`<State value="...">` uses an expression and can seed objects, arrays, or scalar values.
`<Query id="..." path="...">` requires literal text for both attributes.
Any documented XML element may also use `if="..."` for conditional rendering.

The parser also emits internal `Text` nodes for raw text content. Do not author `Text` directly.

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

## Component Surface

See `components.md` for the full component reference.

The current XML surface includes:

- Root: `longlink`
- Primitives: `State`, `Query`, `For`
- Hero: `Hero`, `HeroTitle`, `HeroDescription`, `HeroContent`
- Field: `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`
- Layout: `Columns`, `Column`, `Divider`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Surface: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`, `Table`, `TableCaption`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`
- Identity: `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`
- Form controls: `Button`, `Label`, `Badge`, `Checkbox`, `Switch`, `Slider`, `Input`, `Textarea`, `RadioGroup`, `RadioGroupItem`, `Toggle`, `ToggleGroup`, `ToggleGroupItem`, `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`
- HTML bridge: `p`, `a`, `hr`, `b`, `h1`, `h2`, `h3`, `h4`, `code`, `s`, `sup`, `sub`, `u`, `ul`, `li`

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

## Primitives

### `State`

Use `State` to create a local reactive slot.

```xml
<State id="cart" value="[]" />
```

`id` must be literal text.
`value` is evaluated as an expression.

### `Query`

Use `Query` to fetch JSON into a named slot.

```xml
<Query id="products" path="/api/products" />
```

`id` and `path` must be literal text.

### `For`

Use `For` to render a child scope for each item in an array.

```xml
<For each="products.items" as="product">
  <p>{product.name}</p>
</For>
```

`each` resolves to an array.
`as` names the current item in the child scope.

Use only the elements and attributes documented in this page and in `sdk/longlink/.static/llm/SCHEMA.md`.

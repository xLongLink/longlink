---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

This DSL provides a declarative, schema-driven way to build backoffice applications, admin panels, and internal dashboards using XML as the single source of truth for the UI. Each `.xml` file defines page structure, layout, data bindings, and actions, while the runtime parses the XML, resolves expressions, maps tags to React components, and manages rendering, state initialization, data fetching, and invalidation-driven refreshes. The system is optimized for CRUD workflows, forms, tables, dashboards, and operational tooling, prioritizing consistency, maintainability, validation, and development speed through a strictly declarative and predictable architecture.

## Example

```xml
<longlink>
  <State id="cart" value="[]" />
  <Query id="products" path="/api/products" />
  <For each="$products.items" as="product">
    <Input label="Quantity" value="1" type="number" />
    <Button action="/cart/add" method="POST" json="{{ productId: product.id, quantity: 1 }}">
      Add to cart
    </Button>
    {product.name}
  </For>
  Cart items: {cart.length}
</longlink>
```

## Structure

```text
longlink/
├── sdk/
│   ├── longlink/
│   │   ├── .static/
│   │   │   ├── llm/SCHEMA.md     # Human-readable schema guide
│   │   │   ├── web/              # Packaged frontend assets
│   │   │   └── xsd/              # XML schema definitions
│   │   ├── app.py                # SDK app entrypoint
│   │   ├── router.py             # SDK router wiring
│   │   ├── routes/               # XML page route helpers
│   │   │   ├── metadata.py
│   │   │   └── pages.py
│   │   ├── cli/                  # SDK CLI commands
│   │   ├── database/             # DB helpers and migrations
│   │   ├── types/                # Shared SDK types
│   │   └── utils/                # XML, metadata, and page helpers
│   │
│   └── sample/
│       └── src/pages/            # Sample XML pages and fixtures
│
├── web/
│   └── src/xml/                  # XML runtime, parser, and components
│       ├── core/
│       │   ├── parser.ts          # XML parsing and AST conversion
│       │   ├── context.tsx        # Runtime context setup and provider wiring
│       │   ├── node.tsx           # Node rendering and prop validation
│       │   ├── expressions/       # Expression compilation, evaluation, and helpers
│       │   ├── errors.tsx         # XML error boundary
│       │   ├── query.ts           # Query slot initialization and refetching
│       │   ├── state.ts           # Local reactive state setup
│       │   ├── url.tsx            # Base URL resolution helpers
│       │   └── types.ts
│       ├── primitives/           # Core XML components and layout primitives
│       ├── react/                # Any component that relies on React
│       └── html/                 # HTML bridge components
│
├── api/
│   └── src/pages/                # Control-plane XML pages
└── docs/
    └── src/xml/                  # XML documentation pages
        ├── index.md
        ├── components.md
        └── html.md
```

## Components

The current runtime component surface is:

Primitives:

- `longlink` - root page shell.
- `State` - local reactive state slot.
- `Query` - JSON fetch slot.
- `For` - array iteration in scoped child context.
- `Text` - internal only; produced by the parser for raw text.

React-backed components:

- `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`
- `Badge`
- `Button`
- `ButtonGroup`, `ButtonGroupText`, `ButtonGroupSeparator`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
- `Checkbox`
- `Columns`, `Column`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `Divider`
- `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`
- `Hero`, `HeroTitle`, `HeroDescription`, `HeroContent`
- `Icon`
- `Input`
- `Label`
- `RadioGroup`, `RadioGroupItem`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`
- `Slider`
- `Switch`
- `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Textarea`
- `Toggle`
- `ToggleGroup`, `ToggleGroupItem`
- `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`

HTML bridge:

- `a`, `b`, `code`, `h1`, `h2`, `h3`, `h4`, `hr`, `li`, `ol`, `p`, `s`, `sub`, `sup`, `u`, `ul`

## Parser (web/src/xml/core/parser.ts)

- `parseXML` turns an XML string into AST nodes.
- `Text` nodes are internal parser output for raw text content.

## Context (web/src/xml/core/context.tsx)

- `useXmlContext` reads the active XML runtime state from React context.
- `ContextProvider` exposes a runtime context to rendered XML children.
- `createContext` returns a blank execution context.
- `setupContext` walks the AST, seeds `State` and `Query` nodes, and stores their re-run hooks for invalidation.

## Primitives

- `longlink` is the root page shell.
- `State` declares local reactive state.
- `Query` fetches JSON data into a named slot.
- `For` iterates over arrays in a scoped child context.
- `Text` is internal only and is produced by the parser for raw text content. Do not author it directly.

## Primitive Attribute Rules

- `State.value` must be literal text.
- `Query.id` must be literal text.
- `Query.path` must be literal text.

## Root Metadata

- `longlink` does not support `name` metadata.
- SDK page metadata exposes explicit paths only; do not infer names from filenames.

## Global XML Patterns

- Any element may use `if="..."` for conditional rendering.

## Expressions (web/src/xml/core/expressions/)

- `"test"` a simple string literal. `isText()`
- `[]` an array literal. `isArray()`
- `{}` an expression literal. `isExpression()`
- `$value` a reference to a variable in scope. `isReference()`
- `evaluate(...)` evaluate an expression with the current runtime state.
- `compile(...)` return a resolver that evaluates an expression string against the current runtime state.
- `json` payloads use object-literal expressions such as `{{ fullName: fullName }}`.

## Expression Rules

Allowed:

1. Plain text values like `hello` or `"hello"`.
2. `$` references like `$user.name`.
3. Dotted runtime lookups like `user.name`.
4. Wrapped expressions like `{ count + 1 }`.
5. Arrays, objects, and template literals.
6. Basic arithmetic with `+`, `-`, `*`, and `/`.
7. Mixed text interpolation like `Hello {name}`.

Not allowed:

1. Statements such as `if`, `for`, `return`, `const`, or `function`.
2. Function calls like `format(name)` or `Math.max(a, b)`.
3. Assignments, mutations, and other side effects.
4. Ternaries, logical operators, comparisons, optional chaining, and other unsupported AST nodes.
5. JavaScript that depends on module scope, imports, or globals not present in XML runtime state.

## Adding a new Component

1. Choose the right layer for the component: `primitives/` for XML building blocks, `react/` for React-backed controls, or `html/` for simple HTML bridges.
2. Add the component file with a clear props interface and a short docstring for the component entry point.
3. Keep the implementation declarative and predictable, and reuse `useXmlContext`, `renderNode`, or `useUrl` when the component needs runtime state or child rendering.
4. Wire the component into `web/src/xml/core/node.tsx` so the renderer can resolve the tag, and export it from `web/src/xml/index.ts` if it should be public.
5. Update the XML schema, parser, or runtime helpers if the new component introduces new attributes, bindings, or execution behavior.
6. Add or update documentation and examples so the new tag and its props are discoverable.
7. Add focused tests in both `web/tests/xml/` and `sdk/tests/xml/` for every new component, covering compile-time AST shape, schema validation, and runtime rendering when practical.
8. Add the component definition to the SDK schema pack (`sdk/longlink/.static/xsd/`) and human-readable schema docs (`sdk/longlink/.static/llm/SCHEMA.md`).
9. Verify the component against the existing XML pages or fixtures before shipping it.

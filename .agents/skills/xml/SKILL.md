---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

This DSL provides a declarative, schema-driven way to build backoffice applications, admin panels, and internal dashboards using XML as the single source of truth for the UI. Each `.xml` file defines page structure, layout, data bindings, and actions, while the runtime parses the XML, maps tags to React components, and manages rendering, navigation, state, and REST-based data interactions. The system is optimized for CRUD workflows, forms, tables, dashboards, and operational tooling, prioritizing consistency, maintainability, validation, and development speed through a strictly declarative and predictable architecture.

## Example

```xml
<Page>
  <State id="cart" value="[]" />
  <Query id="products" path="/api/products" />
  <For each="$products.items" as="product">
    <State id="quantity" value="1" />
    <Card if="product.active">
      <Text> {product.name} </Text>
      <Input bind="quantity" type="number" min="1" />
      <Button action="/cart/add" method="POST" json="{{ productId: product.id, quantity: quantity }}">
        Add to cart
      </Button>
    </Card>
  </For>
  <Text> Cart items: {cart.length} </Text>
</Page>
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
│   └── sample/
│       └── src/pages/            # Sample XML pages and fixtures
├── web/
│   └── src/xml/                  # XML runtime, parser, registry, and components
│       ├── core/
│       │   ├── parser.ts          # XML parsing and AST conversion
│       │   ├── runtime.tsx        # Runtime setup and provider wiring
│       │   ├── node.tsx           # Node rendering and prop validation
│       │   ├── registry.tsx
│       │   ├── expressions.ts     # Expression compilation and evaluation
│       │   ├── types.ts
│       │   ├── errors.tsx
│       │   ├── query.ts
│       │   ├── state.ts
│       │   └── url.tsx
│       ├── primitives/           # Page/state/query/iteration components
│       │   ├── Page.tsx
│       │   ├── State.tsx
│       │   ├── Query.tsx
│       │   ├── For.tsx
│       │   └── Text.tsx
│       ├── react/                # React-backed interactive components
│       │   ├── Button.tsx         # Render-only button adapter
│       │   └── Input.tsx
│       └── html/                 # HTML bridge components
│           └── P.tsx
├── api/
│   └── src/pages/                # Control-plane XML pages
└── docs/
    └── src/xml/                  # XML documentation pages
        ├── index.md
        ├── components.md
        ├── layout.md
        ├── primitives.md
        └── html.md
```

## Parser (web/src/xml/core/parser.ts)

- `parseXML` turns an XML string into a DOM-like tree, and toNodes converts that tree into renderable runtime nodes

## Context (web/src/xml/core/context.tsx)

- `useContext`
- `ContextProvider`
- `setupContext`

## Expressions (web/src/xml/core/expressions.ts)

- `"test"` a simple string literal. `isText()`
- `[]` an array literal. `isArray()`
- `{}` an expression literal. `isExpression()`
- `$value` a reference to a variable in scope. `isReference()`
- `evaluate(...)` evaluate an expression with the current runtime state.
- `compile(...)` compile an expression string into a reusable function that accepts runtime state as arguments.

TODO:

- Install [acorn](https://github.com/acornjs/acorn) to prevent use of unsupported syntax and enforce expression constraints.

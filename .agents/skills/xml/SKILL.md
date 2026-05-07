---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

This DSL provides a declarative, schema-driven way to build backoffice applications, admin panels, and internal dashboards using XML as the single source of truth for the UI. Each `.xml` file defines page structure, layout, data bindings, and actions, while the runtime parses the XML, maps tags to React components, and manages rendering, navigation, state, and REST-based data interactions. The system is optimized for CRUD workflows, forms, tables, dashboards, and operational tooling, prioritizing consistency, maintainability, validation, and development speed through a strictly declarative and predictable architecture.

`RenderXML` is the public entrypoint. Runtime setup seeds state and query data first, then `renderNode()` performs expression evaluation and component prop validation. Loop bodies render in their own scoped runtime, and `baseUrl` stays separate from execution context.

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

## Reactivity

```
ComponentScope --> LoopItemScope --> GlobalScope
```

## Runtime

## Expressions

Use [acorn](https://github.com/acornjs/acorn) to parse and validate all expressions:

- Single-expression only. `product.active`, `quantity > 0`, `cart.length`, `product.price * quantity` are allowed
- Control flow statements, function definitions, and side-effectful operations (`if (...) {}`, `for (...) {}`, `while (...) {}`, `function () {}`, `async () => {}`, `await ...`, `return ...`). are not allowed
- Side-effect free: `product.name` and `total + tax` are allowed, while `cart.push(item)`, `quantity++`, and `state.value = 1` are not.
- Mutations must be performed through declarative syntax in `mutate=""` or button request attributes, or through explicit state updates and action handlers.
- Loop scope is isolated, so state declared inside `<For>` is local to the current iteration.
- IDs are scoped automatically inside loops, so repeated components do not require manual unique IDs.
- Use `$id.name` when you need explicit reference form for scoped values.
- Expressions cannot define functions, so constructs like `items.map(x => x.name)` are not allowed.
- Expressions also cannot access globals like `window`, `document`, `localStorage`, or `fetch`.
- They may only reference local state, loop variables, query results, and computed values.
- The mutate syntax is declarative, allowing for operations like `cart += item`, `selected = product.id`, or `filters.status = "active"`.
- Network requests must use `<Query />`, button request attributes, or the `submit="..."` attribute.
- Payload expressions must evaluate to serializable JSON.
- Use `{{...}}` for object-literal payloads that need JSON shape.
- Expressions should remain small, with a recommended maximum of one logical operation, one arithmetic chain, or one object literal.
- The runtime may statically analyze all expressions, so dynamic evaluation features are forbidden.

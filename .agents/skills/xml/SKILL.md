---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

This DSL provides a declarative, schema-driven way to build backoffice applications, admin panels, and internal dashboards.
XML is the single source of truth for page structure, layout, data bindings, and actions.
The runtime parses XML, resolves expressions, maps tags to React components, and manages rendering, state initialization, data fetching, and invalidation-driven refreshes.
The system is optimized for CRUD workflows, forms, tables, dashboards, and operational tooling through a strictly declarative and predictable architecture.

## Example

```xml
<longlink>
  <State id="cart" value="[]" />
  <Query id="products" path="/api/products" />
  <For each="$products.items" as="product">
    ${product.name}
    <Action action="/cart/add" method="POST" json="${{ productId: product.id, quantity: 1 }}">
      Add to cart
    </Action>
  </For>
  Cart items: ${cart.length}
</longlink>
```

## Structure

```text
longlink/
├── web/
│   └── src/xml/                  # XML runtime, parser, context, expressions, adapters, and renderers
├── sdk/
│   └── longlink/
│       ├── .static/
│       │   ├── llm/              # Human-readable schema docs for XML components
│       │   ├── web/              # Packaged runtime assets used by XML rendering
│       │   └── xsd/              # XML schema definitions and adapter contracts
│       ├── app.py                # SDK runtime and page loading
│       ├── router.py             # Route wiring that can serve XML-backed pages
│       └── cli/                  # SDK commands including init/build/migrations
├── api/
│   └── src/pages/                # Control-plane XML pages
├── docs/
│   └── src/xml/                  # XML documentation and examples
└── tests/
    ├── sdk/tests/xml/            # SDK-side XML schema and helper coverage
    └── web/tests/xml/            # Runtime XML parser and rendering coverage
```

## Parser (web/src/xml/core/parser.ts)

- `parseXML` turns an XML string into AST nodes.
- `Text` nodes are internal parser output for raw text content.

## Context (web/src/xml/core/context.tsx)

- `useXmlContext` reads the active XML runtime state from React context.
- `ContextProvider` exposes a runtime context to rendered XML children.
- `createContext` returns a blank execution context.
- `setupContext` walks the AST, seeds `State` and `Query` nodes, and stores their re-run hooks for invalidation.

## Adapters

- `longlink` is the root page shell.
- `State` declares local reactive state.
- `Query` fetches JSON data into a named slot.
- `For` iterates over arrays in a scoped child context.
- `Action` submits requests and can invalidate query slots after success.
- `adapters/` contains the XML tag implementations and shared prop resolvers.
- `core/registry.tsx` maps XML tag names to adapter components.
- `Text` is internal only and is produced by the parser for raw text content. Do not author it directly.

## Adapter Attribute Rules

- `State.value` must be literal text.
- `Query.id` must be literal text.
- `Query.path` must be literal text.

## Global XML Patterns

- Any element may use `if="..."` for conditional rendering.

## Expressions (web/src/xml/expressions/)

- `"test"` a simple string literal. `isText()`
- `[]` an array literal. `isArray()`
- `${}` an expression literal. `isExpression()`
- `$value` a reference to a variable in scope. `isReference()`
- `evaluate(...)` evaluate an expression with the current runtime state.
- `compile(...)` return a resolver that evaluates an expression string against the current runtime state.
- `json` payloads use object-literal expressions such as `${{ fullName: fullName }}`.
- Do not author bare `{name}` or `{{...}}` syntax.

## Expression Rules

Allowed:

1. Plain text values like `hello` or `"hello"`.
2. `$` references like `$user.name`.
3. Wrapped expressions like `${count + 1}`.
4. Arrays, objects, and template literals.
5. Basic arithmetic with `+`, `-`, `*`, and `/`.
6. Mixed text interpolation like `Hello ${name}`.

Not allowed:

1. Statements such as `if`, `for`, `return`, `const`, or `function`.
2. Function calls like `format(name)` or `Math.max(a, b)`.
3. Assignments, mutations, and other side effects.
4. Ternaries, logical operators, comparisons, optional chaining, and other unsupported AST nodes.
5. JavaScript that depends on module scope, imports, or globals not present in XML runtime state.

## Adding a new Component

1. Add the component under `web/src/xml/adapters/`.
2. Add the component file with a clear props interface and a short docstring for the component entry point.
3. Keep the implementation declarative and predictable, and reuse `useXmlContext`, `renderNode`, or `useUrl` when the component needs runtime state or child rendering.
4. Export the component from `web/src/xml/adapters/index.ts` and register it in `web/src/xml/core/registry.tsx` so the renderer can resolve the tag.
5. Update the XML schema, parser, or runtime helpers if the new component introduces new attributes, bindings, or execution behavior.
6. Add or update documentation and examples so the new tag and its props are discoverable.
7. Add focused tests in the matching `web/tests/xml/` and `sdk/tests/xml/` subdirectories for every new component, mirroring `web/src/xml/` and covering compile-time AST shape, schema validation, and runtime rendering when practical.
8. Add the component definition to the SDK schema pack (`sdk/longlink/.static/xsd/`) and human-readable schema docs (`sdk/longlink/.static/llm/SCHEMA.md`).
9. Verify the component against the existing XML pages or fixtures before shipping it.

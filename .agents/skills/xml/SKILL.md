---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
---

This skill explains how the XML runtime is built and how to extend it.
Use it when developing parser behavior, runtime context, component adapters, schema assets, or tests.

## How To Use This Skill

- Load this skill before making XML runtime changes in `web/`, `sdk/`, `docs/`, or `api/`.
- Start by reading the relevant local `CONTRIBUTING.md` and the XML files involved.
- Follow the adapter -> registry -> tests -> docs flow when adding or changing components.
- Prefer the smallest XML-safe change, then verify with focused XML tests.
- If the change affects authoring or examples, update docs or samples in the same pass.

## Runtime Model

- XML is parsed into AST nodes.
- The renderer resolves expressions against a lexical execution context.
- Tags map to React adapters through the XML registry.
- State and query setup happens before page rendering.
- Invalidation reruns stored setup hooks and refreshes subscribed state.

## Structure

This is the source-of-truth layout for XML work.

```text
longlink/
├── api/
│   └── src/pages/        # Control-plane XML pages
├── docs/
│   └── src/xml/          # XML docs and examples for users
├── sdk/
│   ├── longlink/
│   │   └── .static/      # Packaged XML schema assets and authoring helpers
│   └── tests/xml/        # SDK-side XML coverage
└── web/
    ├── src/xml/          # Parser, core runtime, adapters, expressions, registry
    └── tests/xml/        # Runtime parser and adapter coverage
```

## File Areas

- `web/src/xml/core/`: parser, context, render pipeline, registry, URL helpers.
- `web/src/xml/adapters/`: component implementations.
- `web/tests/xml/`: parser, runtime, and adapter coverage.
- `sdk/longlink/.static/xsd/`: packaged schema definitions.
- `docs/src/xml/`: authoring-facing documentation and examples.

## Development Rules

- Keep the XML model declarative and predictable.
- Preserve AST shape and runtime scope semantics.
- Keep `State.value` as a normal object field on the seeded state object.
- Keep `Query.id` and `Query.path` literal.
- Keep `Text` internal to parsing and rendering.
- Use `if` as the shared conditional-rendering attribute.

## Expressions

- Support plain text, `$references`, wrapped `${expressions}`, arrays, objects, template literals, arithmetic, and mixed interpolation.
- Do not introduce unsupported JavaScript syntax or module-scope dependencies.

## Adding or Changing a Component

1. Add or edit the adapter in `web/src/xml/adapters/`.
2. Keep the adapter entry point small and documented.
3. Use `useXmlContext` for runtime scope, `renderNode` for child rendering, and `useUrl` for URL resolution.
4. Export the adapter from `web/src/xml/adapters/index.ts`.
5. Register the tag in `web/src/xml/core/registry.tsx`.
6. Update parser, context, or helper code only when the component needs new runtime behavior.
7. Add focused tests under `web/tests/xml/`.
8. Update SDK XSD assets when the schema changes.
9. Update docs/examples so the new XML shape is discoverable.

## Verification

- Run focused XML tests for parser, context, and the changed adapter.
- Check that the XML page still renders with the intended scope and invalidation behavior.
- Prefer the smallest change that keeps the XML contract consistent.

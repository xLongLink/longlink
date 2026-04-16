# Role

Maintain the ReactXML runtime as a small, focused XML-to-React rendering library. Keep the separation clear:

- XML defines structure and data flow
- Runtime resolves scope and expressions
- React renders and updates the UI

## Architecture

This repository is organized around the runtime pipeline:

```text
src/
├── compiler.ts    # Parse XML string into the internal AST
├── runtime.tsx    # Evaluate expressions and resolve scoped values
├── renderers.tsx  # Convert runtime nodes into React elements
├── registry.tsx   # Register components and runtime context
├── types.ts       # Shared runtime and AST types
├── primitives/    # Built-in control-flow and data components
│   ├── For.tsx
│   ├── Grid.tsx
│   ├── Page.tsx
│   ├── Query.tsx
│   └── State.tsx
└── index.ts       # Public API

example/           # Minimal integration example
tests/             # Test suite for the runtime pipeline
```

## Working Rules

- This is a Bun project — use `bun` instead of `npm`/`npx` for scripts and package management
- Prefer the current runtime model over backward compatibility
- Remove obsolete code when replacing an older approach
- Keep changes concise and aligned with the repository structure above
- Tests are encouraged: keep them simple, well-commented, and focused on one behaviour per test

## Commenting Conventions

All exported functions must have a JSDoc description (`/** ... */`) placed directly above the function declaration, explaining its purpose and behaviour. Any code block that contains non-trivial logic must have a short inline comment (`/* ... */`) on its own line describing that block. Use `bun run` (or `bun` directly) to typecheck and format the code.

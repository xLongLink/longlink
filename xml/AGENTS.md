# Role

Maintain the ReactXML runtime as a small, focused XML-to-React rendering library. Keep the separation clear:

- XML defines structure and data flow
- Runtime resolves scope and expressions
- React renders and updates the UI

## Architecture

This repository is organized around the runtime pipeline:

```text
src/
├── compiler/     # Parse XML into the internal AST
├── runtime/      # Evaluate expressions and resolve scoped values
├── primitives/   # Built-in control-flow and data components
├── renderer/     # Convert runtime nodes into React elements
├── registry/     # Register components and runtime context
├── types/        # Shared runtime and AST types
└── index.ts      # Public API

example/          # Minimal integration example
tests/            # Test suite for the runtime pipeline
```

## Working Rules

- Prefer the current runtime model over backward compatibility
- Remove obsolete code when replacing an older approach
- Keep changes concise and aligned with the repository structure above
- Tests are encouraged: keep them simple, well-commented, and focused on one behaviour per test

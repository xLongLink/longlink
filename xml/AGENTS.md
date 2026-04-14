# ReactXML Project

## Scope

This folder contains the `reactxml` package: a React runtime that renders declarative XML-style node trees into a UI that acts as a pure client of a REST API.

The intended separation of concerns in this project is:

- Backend API: owns data, validation, and mutations
- XML node tree: defines UI structure, bindings, and data flow
- React runtime: resolves expressions, executes queries and actions, manages state, and renders components

## Current Structure

- `src/rendering.tsx`: runtime execution and rendering logic
- `src/types.ts`: public types and node model
- `src/registry.ts`: component registry helpers
- `src/transformation.ts`: tree transformation and traversal utilities
- `src/index.ts` and `index.ts`: package exports
- `example/`: local Vite app used to manually exercise the runtime in a browser

## Working Rules

- Read `AGENTS.md` whenever you enter this folder or a child folder that defines its own one
- Keep a clean separation between public runtime APIs, internal rendering logic, and the demo app
- Prefer scalable primitives over one-off shortcuts in the renderer
- Treat the XML layer as declarative. Business logic should stay in the backend or in explicit runtime primitives such as `Query`, `State`, and `For`
- Keep the example app representative, but do not couple library internals to demo-only code
- Prefer the current development model over backward compatibility when the API needs to change
- Do not write test cases for now
- Default to concise communication
- Finish only when the requested change works end to end

## Implementation Guidance

- New runtime capabilities should be added through explicit node semantics or renderer infrastructure, not ad hoc component-specific branches
- Keep state handling centralized and predictable. Local and global state flows should remain easy to trace
- Preserve a small, understandable public API. If a helper is internal, keep it out of the package surface
- When changing types, update exports and runtime usage together so the package remains coherent
- For browser-facing work, validate both the library build assumptions and the `example/` development flow

## Validation

- Use `bunx tsc --noEmit` for type validation when relevant
- Use `bun run dev` to verify the example app when browser behavior is part of the change
- Run `make format` from this folder when done. If the target does not exist, report that clearly

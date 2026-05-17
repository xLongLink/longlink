# Contributing in `web/`

Thanks for contributing to the web layer.

## Architecture

```text
web/
├── src/
│   ├── App.tsx
│   ├── Layout.tsx
│   ├── main.tsx
│   ├── components/      # Shared app components
│   ├── hooks/           # Shared React hooks
│   ├── lib/             # Shared utilities, API, navigation, query helpers
│   ├── pages/           # Route-level pages
│   ├── sdk/             # SDK-specific app shell and page wiring
│   ├── ui/              # shadcn/ui and shared primitives
│   └── xml/             # XML compiler, runtime, layouts, primitives, components
├── index.html
├── vite.config.ts
└── package.json
```

## What this folder owns

The web package is the frontend runtime for LongLink.

It owns the shared UI, XML runtime, and control-plane rendering path.

## How it works

- `bun run dev` starts the Vite dev server for live preview.
- `bun run build:api` builds the control-plane web bundle.
- `bun run build:sdk` still builds the SDK-targeted bundle.
- `bun run build` remains the default production build.
- `src/sdk/` contains the SDK-specific entrypoints that compose the shared runtime differently from the control-plane path.

## XML

- XML pages are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/node.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.

## Keep changes aligned

- Keep control-plane concerns in the API mode path.
- Use shadcn/ui and the existing `src/ui/` primitives for reusable UI.
- Keep XML runtime and compiler changes inside `src/xml/`.
- Prefer `src/lib/api.ts` helpers over raw `fetch`.
- Remove obsolete flows when replacing them end to end.
- Favor the current MVP model over backward compatibility.

## Formatting

Before PR:

```bash
bun run format
```

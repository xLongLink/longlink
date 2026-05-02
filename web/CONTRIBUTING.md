# Contributing in `web/`

Thanks for contributing to the web layer.

## Architecture

```text
web/
├── src/
│   ├── app entry        # `main.tsx`, `App.tsx`, `Layout.tsx`
│   ├── components/      # Shared app components
│   ├── lib/             # Shared utilities, API, navigation, query helpers
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

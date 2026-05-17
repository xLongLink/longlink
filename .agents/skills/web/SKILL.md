---
name: web
description: Use when editing `web/`, `View.tsx`, shadcn/ui, routing, or the Vite frontend runtime.
---

LongLink web skill.

- Vite dev server: `bun run dev`
- Build modes: `bun run build`, `bun run build:api`, `bun run build:sdk`
- Read `web/CONTRIBUTING.md` first

## Use For

- Frontend app shells, pages, layout, routing, and shared UI
- Metadata-driven view loading in `src/pages/View.tsx`
- Vite, Bun, formatting, and test workflows in `web/`

## Structure

```text
web/
├── CONTRIBUTING.md
├── README.md
├── public/
├── src/
│   ├── App.tsx
│   ├── Layout.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── react-query.ts
│   │   ├── tab-value.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Features.tsx
│   │   ├── Home.tsx
│   │   ├── NotFound.tsx
│   │   ├── Pricing.tsx
│   │   ├── Privacy.tsx
│   │   ├── Sample.tsx
│   │   ├── Terms.tsx
│   │   └── View.tsx
│   └── xml/
│       # Refer to the `xml` skill for anything related to this folder.
│       ├── core/
│       │   ├── context.tsx
│       │   ├── errors.tsx
│       │   ├── expressions/
│       │   ├── node.tsx
│       │   ├── parser.ts
│       │   ├── query.ts
│       │   ├── state.ts
│       │   └── url.tsx
│       ├── html/
│       ├── primitives/
│       ├── react/
│       ├── index.ts
│       ├── renderers.tsx
│       └── types.ts
├── components.json
├── index.html
├── vite.config.ts
└── package.json
```

## Rules

- Keep control-plane concerns in the page layer, especially `src/pages/View.tsx`.
- Prefer existing shadcn/ui components and shared helpers over new abstractions.
- Remove obsolete flows when replacing them end to end.
- Favor the current MVP model over backward compatibility.

## View

- `src/pages/View.tsx` loads metadata, resolves the active page, fetches the page document, and renders it.
- Route params are interpolated into metadata and base URL templates.
- Tab selection is derived from page names before falling back to the route path.
- Page documents are fetched with the expected content type and parsed by the runtime.

## Local Dev

```bash
bun run dev
```

```bash
bun run build
bun run build:api
bun run build:sdk
```

```bash
bun run test
bun run format
```

## When Editing

- Update the skill doc when the frontend route shape or page rendering flow changes.
- Keep the Vite proxy and metadata fetch contract in mind.
- Match the existing web folder conventions before adding new paths.

## Verification

- Run `bun run test` for runtime coverage.
- Run `bun run build` to verify the default bundle.
- Run `bun run format` before finishing.

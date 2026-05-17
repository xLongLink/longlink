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
web/                          # Web app workspace for the frontend runtime
├── CONTRIBUTING.md           # Local contribution rules for web changes
├── README.md                 # Web package overview and usage notes
├── public/                   # Static assets served by Vite as-is
├── src/                      # Application source for the web runtime
│   ├── App.tsx               # Root app composition and routing entry
│   ├── Layout.tsx            # Shared shell for public-facing pages
│   ├── main.tsx              # Client bootstrap and React mount point
│   ├── index.css             # Global styles and theme baseline
│   ├── components/           # Shared app components used across pages
│   ├── hooks/                # Shared React hooks and user/session helpers
│   ├── lib/                  # Shared utilities, query helpers, and adapters
│   │   ├── react-query.ts    # React Query client setup and config
│   │   ├── tab-value.ts      # Helpers for deriving tab-safe route values
│   │   └── utils.ts          # General utility helpers
│   ├── pages/                # Route-level pages and page renderers
│   │   ├── Features.tsx      # Public features landing page
│   │   ├── Home.tsx          # Public home page and auth-aware entry
│   │   ├── NotFound.tsx      # Fallback 404 page for unknown routes
│   │   ├── Pricing.tsx       # Public pricing and rollout page
│   │   ├── Privacy.tsx       # Public privacy policy page
│   │   ├── Sample.tsx        # Live XML sample and component playground
│   │   ├── Terms.tsx         # Public terms of service page
│   │   ├── Impressum.tsx     # Public impressum and legal notice page
│   │   └── View.tsx          # Metadata-driven XML page renderer
│   └── xml/                  # Refer to the `xml` skill for anything related to this folder
├── components.json           # shadcn/ui configuration for generated components
├── index.html                # Vite HTML entry template
├── vite.config.ts            # Vite configuration and build setup
└── package.json              # Web package scripts and dependencies
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
- XML documents are fetched with the expected content type and parsed by the runtime.

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

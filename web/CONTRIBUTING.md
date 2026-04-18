# Contributing in `web/`

Thanks for contributing to web layer.

## Architecture

```text
web/
├── src/
│   ├── components/   # Shared UI components
│   ├── hooks/        # Custom React hooks
│   ├── libs/         # Utility libraries (API, logging)
│   ├── longlink/     # LongLink integration
│   ├── pages/        # Page definitions
│   ├── ui/           # shadcn/ui components
│   ├── xml/          # ReactXML runtime
│   ├── layouts/      # Layout components
│   ├── App.tsx       # Main app entry
│   └── Layout.tsx    # Layout wrapper
└── pages/            # Vite page routes
```

## What this folder owns

Project renders LongLink UI and connects to platform APIs.

## Keep changes aligned

- Use shadcn components for reusable UI elements.
- Keep behavior and styles consistent.
- For static content, write JSX elements explicitly inline (do not use `.map()`).
- Prefer `src/lib/api.ts` utilities (`apiFetch`) over raw `fetch`, unless specific edge case.
- Remove legacy rendering paths when replacing flows.
- Development mode: backward compatibility is optional if current model works end to end.

## Formatting

Before PR:

```bash
bun run format
```

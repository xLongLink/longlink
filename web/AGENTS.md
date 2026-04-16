# Agents

You are working on a vite tailwind shadcn project.

- Use shadcn components for reusable UI elements.
- Ensure consistency across the application.
- For static content, do not use .map(); write each JSX element explicitly inline.

## Architecture

```
web/
├── src/
│   ├── components/     # Shared UI components
│   ├── hooks/         # Custom React hooks
│   ├── libs/          # Utility libraries (API, logging)
│   ├── longlink/      # LongLink integration
│   ├── pages/        # Page definitions
│   ├── ui/           # shadcn/ui components
│   ├── xml/          # ReactXML runtime
│   ├── layouts/       # Layout components
│   ├── App.tsx       # Main app entry
│   └── Layout.tsx    # Layout wrapper
└── pages/            # Vite page routes
```

## Code structure

- `assets`
- `components`
- `hooks`
- `libs`
- `longlink`
- `pages`
- `ui`

## API utilities

- Use `src/lib/api.ts` for API calls; it centralizes the base URL, query params, JSON handling, and error handling.
- Prefer `apiFetch` over direct `fetch` usage unless a specific edge case requires otherwise.

## Pre commit

If there were any edits run:

```bash
bun run format
```

## Development Mode

- The web app is in development mode. Do not preserve legacy rendering paths just for backward compatibility.
- API and schema changes are acceptable while iterating, as long as the current model works correctly end to end.

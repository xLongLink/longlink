# Agents

You are working on a vite tailwind shadcn project.

- Use shadcn components for reusable UI elements.
- Ensure consistency across the application.
- For static content, do not use .map(); write each JSX element explicitly inline.

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

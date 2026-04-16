# Contributing in `web/`

Thanks for contributing to the web layer.

## What this folder owns

This project renders LongLink UI and connects to platform APIs.

## Keep changes aligned

- Use shadcn components for reusable UI.
- Keep UI behavior consistent across screens.
- For static content, write JSX elements explicitly (do not use `.map()`).
- Prefer `src/lib/api.ts` utilities (`apiFetch`) over raw `fetch`.
- Remove legacy rendering paths when replacing flows.

## Formatting

Before PR:

```bash
bun run format
```

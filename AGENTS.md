# Role and Objective

Follow repository guidance, preserving current architecture direction, implementing changes aligned with active development model.

## Architecture

```bash
longlink/
├── api/           # Control plane: auth, organizations, applications, registries, orchestration, API-mode web assets
├── sdk/           # Python SDK: app runtime, CLI, scaffolding, SDK-mode web assets
├── web/           # Vite/React frontend, docs, XML runtime, shared UI, API and SDK bundle modes
└── dev/           # Local development services and reference material
```

## Runtime model

- `api/` owns the LongLink control plane. It serves authentication, users, organizations, applications, infrastructure registries, operations, and the built control-plane web bundle from `api/src/.static/web`.
- `sdk/` owns the Python application developer experience. It provides the FastAPI app runtime, CLI commands such as init/build/dev, application scaffolding, and the built SDK web bundle from `sdk/longlink/.static/web`.
- `web/` owns the React UI and XML renderer. It has two required Vite modes: `api` builds the control-plane/docs bundle into `api/src/.static/web`, and `sdk` builds the embedded application runtime bundle into `sdk/longlink/.static/web`.
- API mode includes authenticated control-plane routes, docs, admin pages, organization pages, and application proxy rendering.
- SDK mode is intentionally smaller: it renders a local application from `/metadata.json` without control-plane user state.
- Keep both web build modes working. Do not remove mode checks, output directories, or SDK/API-specific shell behavior unless the product model changes explicitly.
- The shadcn/ui primitive set in `web/src/components/ui/` is intentionally kept for now, even when some primitives look unused. Do not remove those primitives or their direct dependencies solely as dead-code cleanup.

## Contributing model

- Keep changes small and clear
- Reduce complexity and remove dead code
- Enforce project conventions, normalize naming, improve readability
- Include two blank lines between function definitions
- Always read folder's `CONTRIBUTING.md` for local contributing rules
- Do not add new helper functions unless they are explicitly needed or requested.
- Python functions must have docstrings, and non-trivial logic blocks must have preceding `# ...` comments.
- JavaScript functions must have JSDoc comments, and non-trivial logic blocks must have preceding `// ...` comments.
- Project is in MVP mode: prefer the current model over backward compatibility, remove obsolete code when replacing old flows
- Always check at the end of the implementation, for potential simplifications.
- Write simple, well designed and maintainable code. No strange hacks, use proper solutions
- Pydantic models must group fields by commented sections, and fields inside each section must be ordered from shortest name to longest name.
- Use long domain names in code and filenames (`organization`, `application`, `locations`) instead of abbreviations like `org` or `app`.
- Keep related model module names plural and consistent across the API and database layers (for example `applications.py`, `databases.py`, `computes.py`, `storages.py`, `operations.py`).

VERY IMPORTANT: MVP Mode. there is no need for backward compability, or legacy fallback. If you find any remove those

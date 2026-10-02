# AGENTS.md

You are working on a LongLink Solution project:

- Models and migrations own only this project's schema.
- The SDK owns shared schema definitions and migrations, which the LongLink Platform executes.
- Use `longlink.Audit` for tables that need Platform-user attribution.
- For additional user roles, inherit from `longlink.Model` and declare each as `role: User = UserRelationship()`.

## Code structure

```
├── src/
│   ├── models/       # SQLModel database tables
│   ├── views/        # View files
│   ├── routes/       # API routes
│   ├── schemas/      # Pydantic schemas
│   └── envs.py       # Environments
├── tests/            # Project tests
├── .env.sample       # Environment template
└── main.py           # Service entry point
```

## Solution runtime

- Build the app with `app = LongLink()` and register routers via `app.include_router(...)` in `main.py`.
- Type route parameters as `ctx: Context` for the request database session, storage filesystem, and signed-in user.
- Store one item's files under its own `{item_id}/` storage prefix.

## Views

- A View is a `.jsx` file exporting one default React component; no frontend build is needed in the Solution.
- React, LongLink UI components, `request`, `navigate`, `params`, and `useApi` are supplied by the isolated renderer. Do not import packages.
- Use ordinary JSX props, React state, controlled input callbacks, and JavaScript expressions.
- Display titles come from JSX filenames (`items.jsx` → Items, `[item].jsx` → Item); tabs use the default icon. Do not add metadata sidecars or exports.
- Requests are Solution-relative and pass through a restricted host bridge. Never use direct fetch, Platform credentials, external resources, or parent-window access.
- Prefer `useApi(path)` for required data: it returns data directly, while the renderer handles initial loading, errors, and retry. Cache keys are derived internally from the full path, including query parameters.
- Successful writes through `request()` automatically refresh cached data within this isolated View. No explicit invalidation is needed.
- Use separate `useApi` calls for multiple resources. Mount a component using `useApi` only when its resource is needed. Cached data remains visible if a background refresh fails.
- Use the sample Views as the current JSX API reference.

## Python Guidelines

- Avoid renaming imports.
- Validate types at the boundary.
- Channel YAGNI and KISS principle.
- Avoid `Any`, prefer precise type annotations.
- Keep the code pytonic, prefer readability over efficiency.
- Use clear domain names, prefer single-word Python filenames.
- Prefer namespaced module APIs, over directly importing many related functions.
- Declare `response_model` on FastAPI routes, let FastAPI validating response model.
- Prefer explicit duplication over a local helper when it makes lifecycle code clearer.
- Use exceptions for genuine error conditions, avoid unnecessary `try`/`except` blocks.

## Testing

- Write tests only when instructed.
- Test observable behavior with clear, deterministic assertions.
- Use Arrange, Act, Assert sections for non-trivial tests.
- Mock external boundaries, not business logic.
- Use `longlink.testclient.TestClient` for route tests; constructing it selects in-memory testing services for the app.

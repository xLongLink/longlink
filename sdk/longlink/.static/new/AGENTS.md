# AGENTS.md

You are working on a LongLink Solution project.

## Schema ownership

- Models and migrations own only this project's schema.
- The SDK owns shared schema definitions and migrations. The LongLink Platform executes those migrations.
- For tables that need Platform-user attribution, DO use `longlink.Audit`.
- For additional user roles, DO inherit from `longlink.Model` and declare each role as `role: User = UserRelationship()`.

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

- DO build the app with `app = LongLink()`.
- DO register routers with `app.include_router(...)` in `main.py`.
- DO type route parameters as `ctx: Context` for the request database session, storage filesystem, and signed-in user.
- DO store each item's files under its own `{item_id}/` storage prefix.

## Views

- `longlink dev` generates SDK-owned `frontend.d.ts` in the project root for editor hints. DON'T edit or commit this generated file.
- A View is a `.jsx` file that exports one default React component. The Solution does not need a frontend build.
- The isolated renderer supplies React hooks, `Fragment`, LongLink UI components, `request`, `navigate`, and `useApi`. DON'T import packages.
- Route parameters are passed to the default View function as props: `export default function Item({ params })`.
- For `[item].jsx`, DO read the URL segment with `params.item`.
- DO use `@param {ViewProps} props` in JSDoc for editor hints.
- DO use ordinary JSX props, React state, controlled input callbacks, and JavaScript expressions.
- DO use `useState()`, `useEffect()`, `useMemo()`, and `useRef()` directly, without imports or a `React.` prefix.
- DO use `<>...</>` or `<Fragment>...</Fragment>` for fragments.
- Display titles come from JSX filenames (`items.jsx` → Items, `[item].jsx` → Item). Tabs use the default icon.
- DON'T add metadata sidecars or exports.
- Requests are Solution-relative and pass through a restricted host bridge.
- DON'T use direct fetch, Platform credentials, external resources, or parent-window access.
- For required data, PREFER `const [data, invalidate] = useApi(path)`.
- When that exact path needs revalidation, DO call `await invalidate()`.
- The renderer handles initial loading, errors, and retry. Cache keys come from the full path, including query parameters.
- Successful writes through `request()` automatically refresh cached data within the isolated View. Explicit invalidation is not needed.
- For simple forms, DO use `<Form action="/api/..." method="post">`, named fields, and `<Button type="submit">` instead of draft state.
- `name` includes themed controls in form submissions. DO use `defaultValue` or `defaultChecked` for initial values; use `value`/`onChange` only when reactive state is needed.
- DO use `required`, `disabled`, and `readOnly` props for named fields. Named fields retain themed Astryx controls; use `value` and `onChange` when reactive state is needed.
- Form submissions preserve native semantics: strings, repeated names, omitted unchecked checkboxes, and files. DO receive schemas as `Annotated[Schema, fastapi.Form()]` in Python routes.
- Form handles validation, pending submissions, and request errors. `onSuccess` can close a dialog or navigate. Successful writes refresh cached data without resetting entered values.
- For multiple resources, DO use separate `useApi` calls.
- DO mount a component that uses `useApi` only when its resource is needed.
- Cached data remains visible if a background refresh fails.
- DO use the sample Views as the current JSX API reference.

## Python Guidelines

- AVOID renaming imports.
- DO validate types at system boundaries.
- PREFER the simplest correct implementation. AVOID features needed only for hypothetical future use.
- PREFER precise type annotations to `Any`.
- PREFER idiomatic Python and readability over efficiency.
- DO use clear domain names.
- PREFER single-word Python filenames.
- PREFER namespaced module APIs to importing many related functions directly.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- When duplication makes lifecycle code clearer, PREFER explicit duplication to a local helper.
- DO use exceptions for genuine errors.
- AVOID unnecessary `try`/`except` blocks.

## Testing

- Unless the user requests tests, DON'T write them.
- DO test observable behavior with clear, deterministic assertions.
- For non-trivial tests, DO use Arrange, Act, and Assert sections.
- DO mock external boundaries, not business logic.
- DO use `longlink.testclient.TestClient` for route tests. Constructing it selects in-memory testing services for the app.

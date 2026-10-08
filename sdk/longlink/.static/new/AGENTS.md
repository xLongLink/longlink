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

DO use the docs command to discover available View APIs and inspect their props:

```bash
uv run longlink docs
uv run longlink docs --help
uv run longlink docs --category <name>
uv run longlink docs --component <name>
```

## Python Guidelines

- AVOID renaming imports.
- DO validate types at system boundaries.
- PREFER the simplest correct implementation. AVOID features needed only for hypothetical future use.
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

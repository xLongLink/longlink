# AGENTS.md

You are working on a LongLink application:

- Application models and migrations own only the application schema.
- The SDK owns shared schema definitions and migrations, which the LongLink Platform executes.
- Use `longlink.database.base.AuditTable` for application tables.

## Code structure

```
├── src/
│   ├── models/       # SQLModel application tables
│   ├── pages/        # LongLink pages
│   ├── routes/       # API routes
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Application services
│   └── envs.py       # Enviroments
├── tests/            # Application tests
├── .env.sample       # Environment template
└── main.py           # Application entry pointn
```

## XML pages

- LongLink pages use XML, not HTML.
- Run `longlink docs` to discover the supported XML components.
- Run `longlink docs <component>` before using a component to inspect its attributes, children, and examples.
- Do not invent XML elements or attributes that are absent from the component documentation.

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
- Mock external boundaries, not application logic.

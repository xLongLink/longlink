# AGENTS.md

You are working on a LongLink application.

- Keep changes small and clear.
- Remove obsolete code when replacing old flows.
- Use built-in types for type hints list, dict
- Use | for union types instead of Optional
- All Python functions must include docstring (""" ... """) immediately after definition.
- Any non-trivial Python logic block must have standalone inline comment (# ...) above block.
- Include two blank lines between function definitions.
- Write test cases only when instructed
- Create a function when it gives you a meaningful abstraction boundary. Do not create one just to “split code”.
- Keep improving and cleanup the repository so that it follows the described architecture
- Make sure that the repository is self-contained and portable
- Let fastapi manage the validation, use `response_model`

## Code structure

```
├── src/
│   ├── models/       # SQLModel application tables
│   ├── pages/        # XML pages registered automatically under /pages
│   ├── routes/       # API routes (items.py)
│   ├── schemas/      # Pydantic schemas (items.py)
│   ├── services/     # Application services
│   └── envs.py       # Environment and settings helpers
│
├── tests/
│   └── test_app.py   # Application tests
│
├── .env.sample       # Environment template
├── main.py           # Application entry point
└── pyproject.toml    # Project configuration
```

## Database ownership

- Application models and migrations own only the application schema.
- The SDK owns shared schema definitions and migrations, which the LongLink Platform executes.
- Use plain `SQLModel` for ordinary application tables. Use `longlink.database.AuditTable` only when a table needs Platform-user attribution.
- Do not create, update, delete, or migrate shared tables from application code.

## Testing

- Write tests only when instructed.
- Test observable behavior with clear, deterministic assertions.
- Use Arrange, Act, Assert sections for non-trivial tests.
- Mock external boundaries, not application logic.

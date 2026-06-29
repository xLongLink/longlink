# AGENTS.md

You are working on a LongLink application.

- Keep changes small and clear.
- Remove obsolete code when replacing old flows.
- Use built-in types for type hints list, dict
- Sort the imports by length, starting with import and then from
- Use | for union types instead of Optional
- All Python functions must include docstring (""" ... """) immediately after definition.
- Any non-trivial Python logic block must have standalone inline comment (# ...) above block.
- Include two blank lines between function definitions.
- Write test cases only when instructed
- Create a function when it gives you a meaningful abstraction boundary. Do not create one just to “split code”.
- Keep improving and cleanup the repository so that it follows the described architecture
- Make sure that the repository is self-contained and portable

## Code structure

```
├── src/
│   ├── database/     # SQLModel application tables
│   ├── i18n/         # Translation catalogs registered automatically under /i18n
│   ├── pages/        # XML pages registered automatically under /pages
│   ├── routes/       # API route registration
│   ├── services/     # Database utility services
│   ├── types/        # Pydantic types the responses
│   ├── envs.py       # Environment and settings helpers
│   └── router.py     # Application router definition
│
├── tests/
│   └── conftest.py   # Test fixtures
│
├──.env.sample        # Environment template
├── main.py           # Application entry point
└── pyproject.toml    # Project configuration
```

## Testing

Structure:

- Use AAA sections with comments: # Arrange, # Act, # Assert
- Test names must describe expected behavior
- One test = one behavior
- Keep tests deterministic, isolated, and independently executable
- Prefer explicit assertions (==, exact payloads, exact errors)
  Parametrization:
- Keep @pytest.mark.parametrize on one line
- Use multiple decorators instead of multi-dimensional tuples
- Extract large parameter sets into constants
- Use pytest.param(..., id="...") for non-trivial cases
  Test Design:
- Test observable behavior only
- Do not test framework internals
- Separate API tests from service-layer tests
- Test happy paths, edge cases, and failure paths
- In API tests, assert both status codes and response payloads
- Validate error schemas, not only error codes
- Test authentication separately from authorization
  Fixtures & Data:
- Prefer fixtures/factories/builders over inline complex setup
- Keep fixtures small, composable, and function-scoped by default
- Avoid shared mutable state
- Keep test data minimal and domain-oriented
- Avoid magic values; use named constants
- Prefer immutable inputs
  Mocking:
- Mock external boundaries only (HTTP, DB, filesystem, queues, time)
- Do not mock business logic
- Prefer integration tests for important business flows
- Never call real external services in CI
- Freeze/mock time instead of using sleeps
  FastAPI / DB:
- Use dependency overrides for FastAPI dependencies
- Clear app.dependency_overrides after tests
- Override auth dependencies in tests
- Use transactional rollback fixtures for DB isolation

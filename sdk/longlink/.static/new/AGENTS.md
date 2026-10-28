<!-- LONGLINK:START -->
LongLink v<version>
CLI: run every command as `uv run longlink <cmd>` (shown below as `longlink ...`).

PRINCIPLES:
- KISS: Choose the simplest correct implementation.
- DRY: Avoid duplicated knowledge or business rules. AVOID abstractions that only remove superficial code similarity.
- YAGNI: Avoid features, abstractions, configuration, and extension points needed only for hypothetical future use.
- SRP / Separation of concerns: Keep responsibilities focused and ownership clear.
- High cohesion / Low coupling: Keep related behavior together and reduce unnecessary dependencies.

STRUCTURE:
```t
├── src/
│   ├── models/       # SQLModel database tables - One file per model
│   ├── views/        # View (UI) files
│   ├── routes/       # API routes - One file per resource
│   ├── schemas/      # Pydantic schemas - One file per schema
│   └── envs.py       # Environments
├── tests/            # Project tests
└── main.py           # Entry point
```

RULES:
- USE `ctx.user` to access the current user informations
- USE `ctx.storage` to access the storage filesystem.
- USE `ctx.database` to access the database session.
- USE `longlink.Audit` for Platform-user attribution.
- USE `UserRelationship()` to save users into a table.
- DO run formatting, linting, type checking, and relevant existing tests.
- After verification, DO review the implementation for further simplification.

TESTING:
- Unless the user explicitly requests tests, DON'T add them.
- Where practical, PREFER real implementations and explicit dependency boundaries to mocks or global runtime-state changes.
- DO use Arrange, Act, and Assert sections.
- DO mock external boundaries, not business logic.
- DO use `longlink.testclient.TestClient` for route tests.
- DO test observable behavior with clear, deterministic assertions.

PYTHON:
- AVOID renaming imports.
- DO use clear domain names.
- PREFER single-word Python filenames.
- DO use exceptions for genuine errors.
- DO validate types at system boundaries.
- DO group Pydantic fields into commented sections.
- DO order Pydantic fields within each section from the shortest name to the longest name.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`, or similar result methods.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- DO represent application state with typed models, enums, or structured objects.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- AVOID unnecessary `try`/`except` blocks.
- PREFER the simplest correct implementation.
- AVOID features needed only for hypothetical future use.
- PREFER idiomatic Python and readability over efficiency.
- PREFER namespaced module APIs to importing many related functions directly.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- PREFER explicit duplication to a local helper, When duplication makes lifecycle code clearer.

VIEWS:
- DON'T use browsers or browser automation to inspect or verify changes. DO inspect source and run code-level checks instead.
- DO add JSDoc to JavaScript functions.
- DO keep each page simple and standalone.
- DO extract components only for meaningful UI boundaries.
- AVOID duplicated derived state and effects that do not synchronize with external systems.
- PREFER explicit async/await.
- DO use concurrency only for independent operations.
- DO clean up timers, listeners, subscriptions, and observers.
- Unless unavoidable, AVOID changing global runtime state.
- DON'T wrap individual table rows in `Card`.
- DON'T use raw HTML elements. Use LongLink components for structure and content.
- DON'T use inline `style`, custom `className` values, imported CSS, or hardcoded colors and pixel values to bypass the View component API.
- DON'T add decorative containers, redundant labels, or explanatory text that repeats what the interface already makes clear.

DOCS:
- USE `longlink docs --help` to lists documentation commands:
- USE `longlink docs group <name>` to browse a component group
- USE `longlink docs search "<query>"` to find supported components and runtime APIs
- USE `longlink docs component <Name>` to get props, runtime members, and usage guidance
- USE `longlink docs build "<idea>"` for implementation outline and relevant APIs
- USE `longlink migrate` to generate migrations
<!-- LONGLINK:END -->

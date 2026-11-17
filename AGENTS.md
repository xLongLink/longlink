# LongLink Agent Guide

PRINCIPLES:
- KISS: Choose the simplest correct implementation.
- SRP / Separation of concerns: Keep responsibilities focused and ownership clear.
- High cohesion / Low coupling: Keep related behavior together and reduce unnecessary dependencies.
- YAGNI: Avoid features, abstractions, configuration, and extension points needed only for hypothetical future use.
- DRY: Avoid duplicated knowledge or business rules. AVOID abstractions that only remove superficial similarity.

GENERAL RULES:
- DO validate inputs at system boundaries.
- PREFER simple, maintainable, conventional solutions.
- NEVER create new markdown files unless indicated from the user.
- NEVER EVER EVER add any new comment in markdown files, only fix existing one.
- After creating a merge request, DO return the local checkout to its previous branch.
- When duplication improves clarity, PREFER explicit duplication to helpers or shared code.
- When they simplify implementation, PREFER the standard/established library over handwritten implementations.

TESTING:
- BE critical, test what matters.
- DO use Arrange, Act, and Assert sections.
- DO mock external boundaries, not business logic.
- DO test observable behavior with clear, deterministic assertions.
- PREFER real implementations and explicit dependency boundaries to mocks or global runtime-state changes.

PYTHON:
- AVOID renaming imports.
- DO use clear domain names.
- DO FOLLOW the zen of python.
- PREFER single-word Python filenames.
- DO use exceptions for genuine errors.
- DO validate types at system boundaries.
- AVOID unnecessary `try`/`except` blocks.
- PREFER the simplest correct implementation.
- DO group Pydantic fields into commented sections.
- AVOID features needed only for hypothetical future use.
- PREFER idiomatic Python and readability over efficiency.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- PREFER namespaced module APIs to importing many related functions directly.
- DO represent application state with typed models, enums, or structured objects.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- DO order Pydantic fields within each section from the shortest name to the longest name.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- PREFER explicit duplication to a local helper, When duplication makes lifecycle code clearer.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`.
  
TYPESCRIPT:
- AVOID renaming imports.
- PREFER explicit async/await.
- DO declare route response schemas.
- DO keep each page simple and standalone.
- DO use concurrency only for independent operations.
- DO clean up timers, listeners, subscriptions, and observers.
- When prop types are shared or complex, DO keep named prop types.
- DO inline simple, single-use prop types and `className` expressions.
- DO run formatting, linting, type checking, and relevant existing tests.
- Unless extraction improves reuse, readability, or separation of concerns, PREFER inline logic.
- DO keep each lookup and its immediate existence check together, with the block comment before the lookup.
- AVOID unnecessary cards, duplicated derived state, and effects that do not synchronize with external systems.
- DO return raw domain objects or primitive values without reconstructing response models solely for validation.
- AVOID single-use helpers, unnecessary abstractions, duplicated state, dead code, or complex solutions.

UI/COMPONENTS:
- Use tailwindcss for styling.
- USE react-error-boundary for errors.
- ReUI reference: https://reui.io/llms.txt.
- MapCN reference: https://www.mapcn.dev/llms.txt
- ShadcnUI reference: https://ui.shadcn.com/llms.txt.

VIEWS 
- One file, one view
- LongLink exposes shared UI components for `.jsx` Views to use directly.
- Components are expored with parameters so that the views do not have to apply classNames

COMMIT & MERGE

- USE Conventional Commits for commit messages
- CHOSE a type from `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Optional scopes are `api`, `sdk`, and `web`; omit the scope for cross-area changes.

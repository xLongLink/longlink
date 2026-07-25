---
name: loop
description: Code improvements loop
---

## Loop

1. Inspect enough of the repository to find meaningful improvement candidates.
2. Present a numbered list of concrete options. Include the path, proposed change, why it matters, and whether behavior changes.
3. Wait for the user to select one or more item numbers.
4. Implement only the selected items, keeping changes small and aligned with project conventions.
5. Verify with the most relevant narrow test, lint, type check, or build. If verification cannot run, say why.
6. Summarize what changed and the verification result.
7. Repeat by producing a fresh numbered list.

## Focus

0. Follow the `Python Guidelines` section. If anything does not follow the guidelines, propose a fix. Else, move on and check the next steps.

1. Security: authentication, authorization, tenant isolation, secret handling, unsafe redirects, SSRF, XSS, injection, path traversal, header handling, CORS, CSRF, dependency risk, and sensitive logging. Perform a Static Analysis, Make a Vulnerability research, Find Edge Cases, Bugs, Primitives, Patterns
2. Permissions: organization access, application membership, role checks, user-controlled identifiers, resource ownership, and cross-tenant data access.
3. Validation: request schemas, Pydantic constraints, XML parsing, environment variables, file uploads, URLs, enum handling, database constraints, and clear error responses.
4. Testing: missing regression tests, weak assertions, overfitted AI-generated tests, untested error paths, permission tests, migration tests, API contract tests, XML renderer tests, and frontend behavior tests.
5. Operations: migrations, deployment labels, Kubernetes manifests, retry behavior, idempotency, background operations, observability, logs, timeouts, rollback safety, and cleanup paths.
6. Runtime behavior: API/SDK bundle mode differences, local/testing/production environment differences, storage/database portability, caching, concurrency, and failure handling.
7. Documentation: update `FEATURES.md`, user-facing docs, migration notes, or operational instructions when supported behavior changes.
8. Readyness: The repo is ready and safe to be shipped to production, or a feature is blocking it.
9. Cleanliness: The repo is clean, simple, and maintainable, find simplifications, remove dead code, and reduce complexity without changing behavior.

## Python Guidelines

- The project is in MVP mode, so prioritize simplicity and maintainability over cleverness or performance.
- The project is in MVP mode, no need for backwards compatibility if you find fallback clean them up

- Use safe, practical defaults that minimize required configuration.
- Validate inputs as early as possible, preferably at system boundaries.
- Use exceptions for genuine error conditions while avoiding unnecessary `try` and `except` blocks.
- Represent application state explicitly with typed models, enums, or structured objects.
- Use `Protocol` for behavioral interfaces and dependency contracts.
- Avoid `Any` and prefer precise type annotations.
- Keep logic in one function unless extraction clearly improves reuse, readability, or separation of concerns, and avoid single-use helpers unless they hide a genuinely complex boundary.
- Simplify control flow, remove dead or duplicated code, and review the final implementation for further simplifications.
- Follow existing project conventions for naming, structure, formatting, and architecture.
- Prefer established, well-maintained libraries over handwritten implementations when they reduce complexity.
- Target Python 3+ and do not use the `__future__` module.
- Add a docstring to every Python function.
- Add a descriptive `# ...` comment before each logic block and leave one blank line before the comment.
- Use two blank lines between function definitions and keep function signatures on one line when they fit within the configured line length.
- Do not start Python files with module-level triple-quoted docstrings unless the file is an Alembic revision.
- Do not add `__all__` unless the module has a concrete public star-import contract.
- Use clear domain names, prefer single-word Python filenames, and keep related model module names plural and consistent across API and database layers.
- Avoid renaming imports unless it materially improves clarity or consistency.
- Prefer namespaced module APIs, such as `adapters.database(...)`, over directly importing many related factory functions.
- Group Pydantic model fields into clearly commented sections and order fields from shortest name to longest name within each section.
- Declare `response_model` on FastAPI routes and return raw ORM objects, dictionaries, lists, or primitive values without manually instantiating or validating response models.
- Test the actual implementation rather than duplicating production logic, and do not add new test cases unless explicitly requested.
- Avoid mocks and global runtime-state modifications where practical, preferring real implementations and explicit dependency boundaries.
- Prefer simple, maintainable, conventional solutions over clever hacks.

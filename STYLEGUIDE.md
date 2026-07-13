# LongLink Style Guide

LongLink is an open-source platform for building and running dedicated process-specific applications.

This guide covers public documentation, examples, and repository code conventions. Keep changes practical, small, and aligned with LongLink's existing API, SDK, and web boundaries. The goal is for process-specific applications to stay easy to understand, test, review, deploy, and maintain without proprietary platform lock-in.

## Product Language

Use LongLink terminology consistently.

| Term                  | Use                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| LongLink              | The product as a whole.                                                                                                                         |
| LongLink Platform     | The shared platform layer that owns authentication, organizations, infrastructure registries, operations, deployments, and application routing. |
| LongLink Applications | Process-specific Python applications running on LongLink.                                                                                       |
| LongLink SDK          | The Python package that provides the application runtime, CLI, database helpers, storage helpers, XML page discovery, and packaged assets.      |
| Web frontend          | The Vite/React frontend for public pages, docs, the platform UI, and XML rendering.                                                             |
| Organization          | A tenant boundary for users, shared data, applications, and managed runtime resources.                                                          |
| XML pages             | Declarative page definitions rendered by the LongLink web runtime.                                                                              |

Avoid language from unrelated projects, especially React Native, mobile, native-app, no-code, or generic SaaS-builder framing. LongLink applications are normal Python software with a shared platform foundation.

## Audience and Tone

- Write for developers and technical operators who may not know LongLink internals.
- Be direct, practical, and mature.
- Start with the outcome, requirements, and shortest working path before adding deeper detail.
- Prefer active voice and short sentences.
- Use `you` for the reader and `LongLink` for the product.
- Avoid ambiguous `we`; name the actor instead, such as `contributors`, `the LongLink Platform`, or `the LongLink SDK`.
- Avoid jokes, cultural references, and in-jokes that age poorly or exclude readers.

### Example

**Bad** "LongLink is like React Native for enterprise workflows."

**Good** "LongLink runs process-specific Python applications and provides the shared platform layer around them."

## Documentation Rules

- Document implemented behavior, not roadmap ideas or aspirational behavior.
- Explain ownership boundaries when behavior crosses packages.
- Define LongLink-specific terms before relying on them.
- Include prerequisites, working directories, and environment variables for commands.
- Prefer examples that can be copied and run with minimal hidden setup.
- Use relative links for repository files and stable public links for external references.
- When listing improvement suggestions, use numbered lists.

### Package Boundaries

- `api/` owns the LongLink Platform API: authentication, organizations, applications, infrastructure registries, orchestration, logs, status, and application proxying.
- `sdk/` owns the LongLink SDK: tenant-shared contracts and migrations, application-facing helpers, CLI commands, database helpers, storage helpers, XML page discovery, scaffolding, and packaged static assets.
- `web/` owns the shared frontend runtime, documentation UI, platform UI, and XML renderer used by platform and SDK bundles.
- `dev/` owns local services and reference material.

### Runtime Resource Model

Document resource behavior using the actual LongLink model.

- One organization maps to one database named from the organization UUID hex.
- Each organization database contains one shared organization schema that applications can read.
- Each application gets a schema named from the application UUID hex with application read/write access.
- Organization and application storage bucket names are derived from immutable slugs.
- Organization creation owns database creation and executes tenant migrations packaged by the SDK.
- Application creation owns application schema creation and runtime role provisioning.

## Markdown Style

- Use sentence case for prose and clear title case for major headings.
- Use backticks for commands, paths, routes, environment variables, code symbols, and literal values.
- Use fenced code blocks with a language tag when possible.
- Keep tables for compact reference material, not long prose.
- Keep examples short and focused on the behavior being explained.
- Prefer plain Markdown over HTML unless an existing document already depends on HTML layout.

### Commands

Commands should identify where they run when the location is not obvious.

**Bad**

```bash
uv run pytest tests
```

**Good**

Run from `sdk/`:

```bash
uv run pytest tests
```

### API References

When documenting API behavior, include the route, required authentication, relevant roles, request shape, response shape, and important error cases.

**Good**

```text
GET /api/organizations/{organization_id}
Requires an authenticated organization member.
Returns organization details, users, applications, and visible pending invitations.
```

### SDK References

When documenting SDK behavior, make the application boundary clear. SDK examples should show normal Python/FastAPI code, LongLink helpers, XML pages, environment settings, tests, or build commands as appropriate.

### XML References

When documenting XML pages, include supported tags and attributes, expected data shape, expression behavior, query invalidation, and a minimal runnable example.

## Python Style

- Target the supported project Python version, currently Python 3.14 or newer.
- Use safe defaults that minimize required configuration.
- Validate inputs at system boundaries.
- Prefer precise type annotations and avoid `Any`.
- Use `Protocol` for behavioral interfaces and dependency contracts.
- Represent state explicitly with typed models, enums, or structured objects.
- Keep logic inline unless extraction improves reuse, readability, or separation of concerns.
- Avoid private `_...` helpers that only wrap short local sequences.
- Add a docstring to every Python function.
- Add a descriptive `# ...` comment before each logic block and leave one blank line before the comment.
- Keep a lookup and its immediate existence check in the same logic block.
- Use two blank lines between function definitions.
- Do not use `from __future__` imports.
- Do not add `__all__` unless the module has a concrete star-import contract.
- Prefer namespaced module APIs, such as `adapters.database(...)`, over importing many related factory functions directly.
- Declare `response_model` on FastAPI routes and return raw ORM objects, dictionaries, lists, or primitive values.
- Avoid manually instantiating response models only to validate route output.

## TypeScript and React Style

- Validate inputs at system boundaries.
- Avoid `any`; prefer precise types, generics, `unknown` with narrowing, and discriminated unions.
- Avoid unsafe assertions and truthiness checks when `0`, `false`, or empty strings are valid.
- Keep logic inline unless extraction improves reuse, readability, or separation of concerns.
- Extract components only for meaningful UI boundaries.
- Inline simple single-use prop types and `className` expressions.
- Avoid unnecessary cards, duplicated derived state, index-based keys, and effects that do not synchronize with external systems.
- Prefer explicit `async` and `await`.
- Handle every promise and clean up timers, listeners, subscriptions, and observers.
- Use established libraries for validation, routing, forms, dates, URLs, parsing, and internationalization when they simplify the implementation.

## Testing and Verification

- Test the actual implementation rather than duplicating production logic in tests.
- Avoid mocks and global runtime-state modifications where practical.
- Run the smallest relevant format, lint, type-check, build, or test command for the change.
- For documentation-only changes, review the rendered Markdown or at least inspect the diff for broken links, stale terms, and formatting issues.

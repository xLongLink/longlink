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


## Testing and Verification

- Test the actual implementation rather than duplicating production logic in tests.
- Avoid mocks and global runtime-state modifications where practical.
- Run the smallest relevant format, lint, type-check, build, or test command for the change.
- For documentation-only changes, review the rendered Markdown or at least inspect the diff for broken links, stale terms, and formatting issues.

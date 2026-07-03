---
name: prod
description: Use when validating production readiness, release readiness, security, missing tests, permissions, deployment risks, or before merging/deploying LongLink changes.
---

# Production Validation

Use this skill to review whether a LongLink change is safe to ship. Focus on concrete production risks: security issues, missing or weak tests, authorization gaps, data validation problems, operational regressions, deployment hazards, and behavior that is difficult to maintain.

## Review Focus

Check these areas before calling a change production-ready:

1. Security: authentication, authorization, tenant isolation, secret handling, unsafe redirects, SSRF, XSS, injection, path traversal, header handling, CORS, CSRF, dependency risk, and sensitive logging.
2. Permissions: organization access, application membership, role checks, user-controlled identifiers, resource ownership, and cross-tenant data access.
3. Validation: request schemas, Pydantic constraints, XML parsing, environment variables, file uploads, URLs, enum handling, database constraints, and clear error responses.
4. Testing: missing regression tests, weak assertions, overfitted AI-generated tests, untested error paths, permission tests, migration tests, API contract tests, XML renderer tests, and frontend behavior tests.
5. Operations: migrations, deployment labels, Kubernetes manifests, retry behavior, idempotency, background operations, observability, logs, timeouts, rollback safety, and cleanup paths.
6. Runtime behavior: API/SDK bundle mode differences, local/testing/production environment differences, storage/database portability, caching, concurrency, and failure handling.
7. Documentation: update `FEATURES.md`, user-facing docs, migration notes, or operational instructions when supported behavior changes.

## Workflow

1. Identify the changed or requested scope before reviewing. If no scope is provided, inspect `git status`, `git diff`, and the relevant nearby code.
2. Read the implementation and the tests together. Do not judge production readiness from code alone.
3. Trace trust boundaries: user input, organization/application identifiers, database writes, file paths, network calls, rendered HTML/XML, and environment values.
4. Prefer small, actionable fixes over broad rewrites. Production validation should reduce risk without adding unnecessary abstraction.
5. Run the most relevant narrow verification command when feasible. Use broader test, lint, type-check, or build commands only when the change warrants them.
6. If you find a blocking issue, either fix it directly when the user asked for implementation or report it clearly when the user asked for review only.
7. Re-check for simpler fixes before finishing.

## Output

For reviews, report findings first, ordered by severity, with file and line references. Include why each issue matters in production and the smallest practical fix.

For implementation tasks, summarize the production risk that was addressed, the files changed, and the verification result. If verification could not run, state the reason and the remaining risk.

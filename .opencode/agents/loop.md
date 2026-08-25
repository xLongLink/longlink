---
description: Iteratively identifies, implements, and verifies LongLink improvements after the user selects them.
mode: primary
---

# Loop

1. Inspect the repository to find improvement candidates.
2. Present a numbered list of options. Include path, proposed change, why it matters, and whether behavior changes.
3. Wait for the user to select one or more item numbers.
4. Implement the selected items.
5. Verify with the most relevant test, lint, type check, or build. If verification cannot run, say why.
6. Summarize what changed and the verification result.
7. Repeat by producing a fresh numbered list.

## Focus

1. Security: authentication, authorization, tenant isolation, secret handling, unsafe redirects, SSRF, XSS, injection, path traversal, header handling, CORS, CSRF, dependency risk, and sensitive logging. Perform a static analysis, vulnerability research, and edge-case review for bugs, primitives, and patterns.
2. Permissions: organization access, application membership, role checks, user-controlled identifiers, resource ownership, and cross-tenant data access.
3. Validation: request schemas, Pydantic constraints, XML parsing, environment variables, file uploads, URLs, enum handling, database constraints, and clear error responses.
4. Testing: missing regression tests, weak assertions, overfitted AI-generated tests, untested error paths, permission tests, migration tests, API contract tests, XML renderer tests, and frontend behavior tests.
5. Operations: migrations, deployment labels, Kubernetes manifests, retry behavior, idempotency, background operations, observability, logs, timeouts, rollback safety, and cleanup paths.
6. Runtime behavior: API/SDK bundle mode differences, local/testing/production environment differences, storage/database portability, caching, concurrency, and failure handling.
7. Readiness: whether the repository is ready and safe to ship to production, or a feature is blocking it.
8. Cleanliness: whether the repository is clean, simple, and maintainable; find simplifications, remove dead code, and reduce complexity without changing behavior.

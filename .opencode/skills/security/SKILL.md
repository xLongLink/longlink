---
name: security
description: Inspect LongLink for high-confidence security vulnerabilities and implement focused fixes without disrupting legitimate behavior. Use when the user asks for a security review, vulnerability audit, secure-code hardening, or remediation; do not use for a general cleanup or style review.
---

# Task

Inspect the repository for concrete security vulnerabilities and, when the user has asked for changes, implement the smallest complete fixes. Preserve legitimate behavior and public contracts unless changing them is necessary to close a vulnerability. It is acceptable—and usually required—for a fix to reject malicious, unauthorized, malformed, or unsafe input that was previously accepted.

Honor the requested mode:

- For a review, audit, explanation, or report, inspect and report without modifying files.
- For a fix, remediation, or hardening request, implement and verify the changes.

Prioritize exploitable weaknesses over generic hardening. Treat a finding as confirmed only when the repository provides evidence of:

1. an attacker-controlled or insufficiently trusted source;
2. a reachable security-sensitive sink or violated security invariant;
3. a realistic path between them under stated preconditions; and
4. meaningful confidentiality, integrity, authentication, authorization, or availability impact.

Keep speculative concerns and defense-in-depth suggestions separate from confirmed vulnerabilities. Do not inflate severity from a scanner result, dangerous-looking function, or dependency version alone.

## 0. Project conventions

Read and follow the `Python Guidelines` section in `AGENTS.md`, plus any more specific `AGENTS.md` files that govern files under review. Also inspect the relevant project configuration, lockfiles, framework settings, migrations, tests, CI workflows, and security documentation before changing code.

Use the repository's existing formatting, linting, typing, testing, logging, exception, async, ORM, and dependency-management conventions. Do not add a new security library, scanner, middleware layer, or abstraction when an existing project or standard-library mechanism safely solves the problem.

## 1. Attack surface and trust boundaries

Map only enough of the system to review the relevant paths accurately:

- HTTP/API routes, WebSockets, webhooks, RPC handlers, CLI commands, workers, scheduled jobs, uploads, import/export flows, and admin operations;
- users, roles, tenants, service identities, anonymous callers, and internal callers that may still be untrusted;
- request data, headers, cookies, tokens, files, database records, queues, caches, environment variables, and third-party responses;
- database queries, filesystem operations, subprocesses, template rendering, deserialization, redirects, outbound requests, credential use, and privileged state changes.

Trace data and identity across actual call paths. Account for middleware, decorators, dependency injection, model hooks, background jobs, proxy behavior, and framework defaults before deciding that a control is present or missing.

## 2. Authentication and sessions

Check for:

- routes or alternate methods that bypass authentication;
- fail-open authentication, insecure defaults, or optional credentials on protected paths;
- incorrect password hashing, password-reset, invitation, email-verification, or account-recovery flows;
- token verification that omits signature, algorithm restrictions, issuer, audience, expiration, not-before, or intended token type;
- session fixation, weak session rotation or revocation, insecure cookie attributes, and incomplete logout;
- CSRF exposure for cookie-authenticated state changes;
- user enumeration, replayable authentication artifacts, and weak or predictable secrets;
- unsafe trust in proxy, host, origin, forwarding, or identity headers.

Do not confuse decoding a token with verifying it. Ensure every accepted credential is bound to the expected context and purpose.

## 3. Authorization and tenant isolation

Check authorization at every operation that reads, creates, changes, deletes, exports, or acts on protected data:

- object-level authorization and ownership checks (IDOR/BOLA);
- role, permission, and administrative boundaries;
- tenant scoping in queries, caches, jobs, files, channels, and bulk operations;
- mass assignment and over-posting of privileged fields;
- authorization performed only in the UI, serializer, router, or an earlier request;
- confused-deputy behavior involving service accounts or privileged helpers;
- identifiers, cursors, signed URLs, or job IDs that grant unintended access;
- state changes whose authorization becomes stale before use.

Prefer default-deny decisions and scope data access at the query or operation boundary. An existence check is not an authorization check, and possession of an identifier is not proof of access.

## 4. Injection and unsafe interpretation

Trace untrusted values into interpreters and structured operations, including:

- SQL, ORM escape hatches, NoSQL filters, search expressions, and dynamic query fragments;
- shell commands, subprocess arguments, environment variables, and executable paths;
- server-side templates, expression languages, dynamic imports, `eval`, and `exec`;
- unsafe `pickle`, YAML, object, XML, archive, or other deserialization;
- HTTP headers, email headers, logs, redirects, and response splitting;
- regular expressions or parsers vulnerable to disproportionate work;
- LDAP, XPath, GraphQL, or other query languages used by the project.

Use parameterized or structured APIs. Validate according to the destination grammar rather than relying on ad hoc escaping or deny lists.

## 5. Files, paths, uploads, and outbound requests

Check for:

- path traversal, absolute-path escape, unsafe joins, alternate encodings, and canonicalization mistakes;
- symlink and time-of-check/time-of-use races;
- archive extraction outside the destination, decompression bombs, and unsafe temporary files;
- upload type confusion, executable content, unsafe filenames, public exposure, overwrite, and missing size limits;
- server-side request forgery through URLs, redirects, DNS rebinding, alternate IP formats, or non-HTTP schemes;
- unintended access to loopback, link-local, private networks, cloud metadata, Unix sockets, or local files;
- open redirects and attacker-controlled callback destinations.

Canonicalize once at the correct boundary, then enforce containment or an allowlist on the canonical value. For outbound requests, apply the policy to every redirect and resolved destination, not just the original string.

## 6. Sensitive data, secrets, and cryptography

Check for:

- credentials, signing keys, tokens, private URLs, or personal data committed to source or exposed through logs, traces, metrics, errors, caches, or API responses;
- serializers and schemas that expose internal or privileged fields by default;
- secrets passed in URLs, command lines, client-visible configuration, or long-lived artifacts;
- weak randomness, predictable identifiers used as authorization, insecure comparisons, or home-grown cryptography;
- incorrect key, nonce, salt, mode, signature, certificate, or TLS verification handling;
- encryption without authenticity, insecure fallback algorithms, or reused cryptographic material;
- retention and cache behavior that outlives the intended access.

Use established cryptographic APIs and project-approved secret storage. If a real secret is discovered, never reproduce its value in output. Removing it from code or history does not rotate it; clearly identify rotation or revocation as a separate required action.

## 7. Web, API, and protocol security

Check behavior relevant to the frameworks and protocols actually used:

- CORS, CSRF, origin checks, cookie scope, clickjacking, MIME handling, and content security controls;
- reflected, stored, and DOM-oriented cross-site scripting where server output or generated client code is involved;
- request body, header, upload, batch, pagination, and decompressed-size limits;
- webhook signature verification, timestamp/freshness checks, replay protection, and canonical byte handling;
- cache keys and cache-control that may mix users, tenants, authorization states, or sensitive responses;
- ambiguous parsing between proxies and applications, duplicate parameters, and inconsistent content-type handling;
- GraphQL introspection, field authorization, query depth, complexity, and batching where applicable.

Do not add headers or middleware mechanically. Verify where TLS terminates, which proxy is authoritative, and whether the control is already applied by infrastructure.

## 8. Data integrity, concurrency, and state transitions

Check for:

- non-atomic authorization, balance, quota, inventory, or one-time-token checks;
- replay, duplicate submission, missing idempotency, and stale-state updates;
- race conditions that bypass limits or produce privileged state;
- missing database constraints where correctness or tenant isolation depends on uniqueness or referential integrity;
- partial writes, unsafe transaction boundaries, and side effects performed before durable authorization or validation;
- jobs or events that can be forged, reordered, duplicated, or applied to the wrong principal;
- locks held across network I/O or synchronization that creates a denial-of-service path.

Enforce critical invariants atomically at the narrowest authoritative layer. Tests alone do not make a multi-step check atomic.

## 9. Availability and resource control

Look for attacker-triggerable resource exhaustion, including:

- unbounded reads, uploads, decompression, recursion, collection materialization, fan-out, pagination, or query results;
- expensive regexes, parsing, sorting, rendering, hashing, or database queries on untrusted input;
- N+1 operations or repeated external calls that amplify a single request;
- missing timeouts, cancellation, concurrency limits, backpressure, or retry bounds;
- blocking filesystem, network, CPU, or database work on an async event loop;
- unbounded task creation, queue growth, cache growth, connection use, or error logging;
- rate limits keyed to attacker-controlled or incorrectly trusted identity data.

Bound work at entry points and propagate deadlines or cancellation where the project supports them. Avoid retries that multiply load during partial failure.

## 10. Dependencies, supply chain, and configuration

Review relevant manifests, lockfiles, build scripts, CI workflows, containers, and deployment configuration for:

- known vulnerable dependencies whose affected functionality and version range are actually reachable;
- unpinned, mutable, abandoned, duplicated, typosquatted, or unnecessary packages;
- package confusion, unsafe install/build hooks, and untrusted artifact or code execution;
- CI tokens exposed to untrusted pull requests, scripts, artifacts, caches, or logs;
- debug mode, permissive origins, default credentials, disabled verification, public storage, or overly broad privileges;
- containers running as root or with unnecessary capabilities, writable sensitive paths, or secrets baked into images;
- production behavior that silently falls back to an insecure development configuration.

Verify vulnerability claims against current authoritative advisories when current external data is available or requested. Prefer the smallest compatible upgrade that fixes a confirmed issue, preserve the lockfile, and run compatibility tests. Do not perform broad dependency modernization as part of a focused security fix.

## 11. Error handling and security controls

Check for:

- broad exceptions that convert authentication, authorization, validation, or verification failures into success;
- swallowed errors that leave partial privileged state;
- fallback paths that disable verification or use unsafe defaults;
- detailed errors, stack traces, query text, credentials, tokens, or personal data returned to callers;
- distinguishable errors that enable sensitive enumeration when that matters;
- logging of untrusted data without safe structure or of sensitive data without redaction;
- security checks implemented only as assertions that may be disabled.

Fail closed for security decisions while retaining actionable server-side diagnostics. Preserve exception context without exposing internal details to untrusted callers.

## 12. Tests

For each implemented fix, add or update a focused regression test that demonstrates both sides of the boundary:

- the malicious, unauthorized, cross-tenant, replayed, or oversized case is blocked; and
- the corresponding legitimate use still succeeds.

Prefer observable security behavior over implementation-detail, call-count, exact-error-text, or middleware-order assertions. Avoid reproducing the vulnerable production logic in tests. Use realistic identities and trust boundaries, and include concurrency or transaction tests when the flaw depends on timing.

Do not send exploit traffic to production or third-party systems. Keep proof cases local and minimally harmful.

## Remediation principles

Apply these pragmatically:

- **Secure by default** — require an explicit decision to weaken a protection.
- **Least privilege** — grant only the data and operations required for the current principal and task.
- **Complete mediation** — enforce security checks on every relevant path and operation.
- **Fail closed** — errors in a security decision must not grant access or disable verification.
- **Minimize attack surface** — remove unnecessary exposure, dangerous interpretation, and privileged reachability.
- **Defense in depth** — add a second control when it addresses a realistic bypass or failure mode, not as decorative hardening.
- **Single source of truth** — centralize security invariants without hiding them behind needless indirection.
- **Minimal complete fix** — close the full attack path without unrelated refactoring or broad behavior changes.

Do not silently choose product policy. Ask before making a material decision such as changing role semantics, token lifetime, account-recovery behavior, external access, key rotation, data retention, schema compatibility, or a public API contract when the repository does not establish the intended rule.

## Verification and reporting

Run the narrowest relevant tests first, then the applicable broader suite, formatter, linter, type checker, and repository-configured security checks. Inspect the final diff for bypasses, duplicated controls, accidental secret exposure, unsafe migrations, dependency drift, and unrelated edits.

For every confirmed finding or fix, record concisely:

- severity and confidence;
- attacker capability and required preconditions;
- the source-to-sink path or violated invariant;
- practical impact;
- affected files or components;
- remediation and verification performed; and
- any deployment, migration, revocation, or rotation step still required.

Lead with fixed or confirmed vulnerabilities. Separate unresolved findings, defense-in-depth suggestions, and unverifiable assumptions. If no high-confidence vulnerability is found, say so directly and summarize the security-sensitive paths and checks reviewed; do not manufacture findings to fill a report.
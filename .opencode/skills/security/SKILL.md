---
name: security
description: Inspect LongLink for high-confidence security vulnerabilities and implement focused fixes without disrupting legitimate behavior. Use when the user asks for a security review, vulnerability audit, secure-code hardening, or remediation. Do not use for general cleanup or style review.
---

# Security

## Task and scope

- DO inspect for concrete security vulnerabilities.
- For a review, audit, explanation, or report, DO inspect and report without editing files.
- For a fix, remediation, or hardening request, DO implement and verify the smallest complete fixes.
- Unless a change is necessary to close a vulnerability, DO preserve legitimate behavior and public contracts.
- You CAN reject malicious, unauthorized, malformed, or unsafe input that was previously accepted. If closing the vulnerability requires rejection, DO reject that input.
- DO prioritize exploitable weaknesses over generic hardening.

DO confirm a finding only when repository evidence establishes:

1. An attacker-controlled or insufficiently trusted source.
2. A reachable security-sensitive operation or violated security invariant.
3. A realistic path between them under stated preconditions.
4. Meaningful impact on confidentiality, integrity, authentication, authorization, or availability.

DO separate speculative concerns and defense-in-depth suggestions from confirmed vulnerabilities. DON'T increase severity based only on a scanner result, function name, or dependency version.

## 0. Project conventions

- DO read and follow `AGENTS.md`, including its Python Guidelines and any more specific instructions for the reviewed files.
- Before changing code, DO inspect relevant configuration, lockfiles, framework settings, migrations, tests, CI workflows, and security documentation.
- DO use existing formatting, linting, typing, testing, logging, exception, async, ORM, and dependency-management conventions.
- When an existing project or standard-library mechanism safely solves the problem, DON'T add a security library, scanner, middleware layer, or abstraction.

## 1. Attack surface and trust boundaries

DO map enough of the system to review relevant paths accurately. PREFER including relevant:

- HTTP/API routes, WebSockets, webhooks, RPC handlers, CLI commands, workers, scheduled jobs, uploads, import/export flows, and administrative operations;
- users, roles, tenants, service identities, anonymous callers, and potentially untrusted internal callers;
- request data, headers, cookies, tokens, files, database records, queues, caches, environment variables, and third-party responses;
- database queries, filesystem operations, subprocesses, template rendering, deserialization, redirects, outbound requests, credential use, and privileged state changes.

DO trace data and identity through actual call paths. Before deciding that a control exists or is missing, DO account for middleware, decorators, dependency injection, model hooks, background jobs, proxies, and framework defaults.

## 2. Authentication and sessions

DO check relevant paths for:

- routes or alternate methods that bypass authentication;
- fail-open authentication, insecure defaults, or optional credentials on protected paths;
- incorrect password hashing, password reset, invitations, email verification, or account recovery;
- token verification that omits signatures, algorithm restrictions, issuer, audience, expiration, not-before, or intended token type;
- session fixation, weak rotation or revocation, insecure cookie attributes, and incomplete logout;
- CSRF exposure for cookie-authenticated state changes;
- user enumeration, replayable authentication artifacts, and weak or predictable secrets;
- unsafe trust in proxy, host, origin, forwarding, or identity headers.

Decoding a token does not verify it. DO verify that each accepted credential is bound to the expected context and purpose.

## 3. Authorization and tenant isolation

DO check authorization for each operation that reads, creates, changes, deletes, exports, or acts on protected data. DO check relevant:

- object-level authorization and ownership (IDOR/BOLA);
- role, permission, and administrative boundaries;
- tenant scope in queries, caches, jobs, files, channels, and bulk operations;
- mass assignment and over-posting of privileged fields;
- authorization performed only in the UI, serializer, router, or an earlier request;
- confused-deputy behavior in service accounts or privileged helpers;
- identifiers, cursors, signed URLs, or job IDs that grant unintended access;
- state changes with authorization that becomes stale before use.

PREFER default-deny decisions and data access scoped at the query or operation boundary. An existence check is not an authorization check. An identifier is not proof of access.

## 4. Injection and unsafe interpretation

DO trace relevant untrusted values into interpreters and structured operations, including:

- SQL, ORM escape mechanisms, NoSQL filters, search expressions, and dynamic query fragments;
- shell commands, subprocess arguments, environment variables, and executable paths;
- server-side templates, expression languages, dynamic imports, `eval`, and `exec`;
- unsafe `pickle`, YAML, object, XML, archive, or other deserialization;
- HTTP headers, email headers, logs, redirects, and response splitting;
- regular expressions or parsers that permit disproportionate work;
- LDAP, XPath, GraphQL, or other query languages used by the project.

DO use parameterized or structured APIs. DO validate against the destination grammar instead of relying on ad hoc escaping or deny lists.

## 5. Files, paths, uploads, and outbound requests

DO check relevant paths for:

- path traversal, absolute-path escape, unsafe joins, alternate encodings, and canonicalization errors;
- symlink and time-of-check/time-of-use races;
- archive extraction outside the destination, decompression bombs, and unsafe temporary files;
- upload type confusion, executable content, unsafe filenames, public exposure, overwrite, and missing size limits;
- server-side request forgery through URLs, redirects, DNS rebinding, alternate IP formats, or non-HTTP schemes;
- unintended access to loopback, link-local, private networks, cloud metadata, Unix sockets, or local files;
- open redirects and attacker-controlled callback destinations.

DO canonicalize once at the correct boundary and enforce containment or an allowlist on that value. For outbound requests, DO apply policy to every redirect and resolved destination, not only the original string.

## 6. Sensitive data, secrets, and cryptography

DO check relevant paths for:

- credentials, signing keys, tokens, private URLs, or personal data committed to source or exposed through logs, traces, metrics, errors, caches, or API responses;
- serializers and schemas that expose internal or privileged fields by default;
- secrets in URLs, command lines, client-visible configuration, or long-lived artifacts;
- weak randomness, predictable authorization identifiers, insecure comparisons, or custom cryptography;
- incorrect handling of keys, nonces, salts, modes, signatures, certificates, or TLS verification;
- encryption without authenticity, insecure fallback algorithms, or reused cryptographic material;
- retention and caching that outlast intended access.

DO use established cryptographic APIs and project-approved secret storage. If a real secret is found, DON'T reproduce its value in output. Removing a secret from code or history does not rotate it. DO identify rotation or revocation as a separate required action.

## 7. Web, API, and protocol security

For the frameworks and protocols in use, DO check relevant:

- CORS, CSRF, origin checks, cookie scope, clickjacking, MIME handling, and content security controls;
- reflected, stored, and DOM-oriented cross-site scripting in server output or generated client code;
- request body, header, upload, batch, pagination, and decompressed-size limits;
- webhook signatures, timestamp/freshness checks, replay protection, and canonical bytes;
- cache keys and cache-control that mix users, tenants, authorization states, or sensitive responses;
- ambiguous proxy/application parsing, duplicate parameters, and inconsistent content-type handling;
- GraphQL introspection, field authorization, query depth, complexity, and batching.

DON'T add headers or middleware without examining their purpose and deployment context. DO verify TLS termination, the authoritative proxy, and controls already supplied by infrastructure.

## 8. Data integrity, concurrency, and state transitions

DO check relevant paths for:

- non-atomic authorization, balance, quota, inventory, or one-time-token checks;
- replay, duplicate submissions, missing idempotency, and stale-state updates;
- races that bypass limits or produce privileged state;
- missing database constraints needed for correctness or tenant isolation;
- partial writes, unsafe transaction boundaries, and side effects before durable authorization or validation;
- jobs or events that can be forged, reordered, duplicated, or applied to the wrong principal;
- locks across network I/O or synchronization that creates denial-of-service paths.

DO enforce critical invariants atomically at the narrowest authoritative layer. Tests alone do not make a multi-step check atomic.

## 9. Availability and resource control

DO investigate relevant attacker-triggerable resource exhaustion, including:

- unbounded reads, uploads, decompression, recursion, collection materialization, parallel requests, pagination, or query results;
- expensive regular expressions, parsing, sorting, rendering, hashing, or queries on untrusted input;
- N+1 operations or repeated external calls that amplify one request;
- missing timeouts, cancellation, concurrency limits, backpressure, or retry bounds;
- blocking filesystem, network, CPU, or database work on an async event loop;
- unbounded tasks, queues, caches, connections, or error logging;
- rate limits based on attacker-controlled or incorrectly trusted identity data.

DO bound work at entry points. Where the project supports them, DO propagate deadlines or cancellation. AVOID retries that multiply load during partial failure.

## 10. Dependencies, supply chain, and configuration

DO review relevant manifests, lockfiles, build scripts, CI workflows, containers, and deployment configuration for:

- known vulnerable dependencies with reachable affected functionality and versions;
- unpinned, mutable, abandoned, duplicated, typosquatted, or unnecessary packages;
- package confusion, unsafe install/build hooks, and untrusted artifact or code execution;
- CI tokens exposed to untrusted pull requests, scripts, artifacts, caches, or logs;
- debug mode, permissive origins, default credentials, disabled verification, public storage, or excessive privileges;
- containers with root access, unnecessary capabilities, writable sensitive paths, or embedded secrets;
- production behavior that silently uses insecure development configuration as a fallback.

When current external data is available or requested, DO verify vulnerability claims against current authoritative advisories. PREFER the smallest compatible upgrade that fixes a confirmed issue. DO preserve the lockfile and run compatibility tests. DON'T perform broad dependency modernization as part of a focused security fix.

## 11. Error handling and security controls

DO check relevant paths for:

- broad exceptions that convert authentication, authorization, validation, or verification failures into success;
- swallowed errors that leave partial privileged state;
- fallbacks that disable verification or use unsafe defaults;
- detailed errors, stack traces, query text, credentials, tokens, or personal data returned to callers;
- distinguishable errors that enable sensitive enumeration;
- unstructured logging of untrusted data or unredacted sensitive data;
- security checks implemented only as assertions that can be disabled.

DO fail closed for security decisions and retain actionable server-side diagnostics. DO preserve exception context without exposing internal details to untrusted callers.

## 12. Tests and proof cases

- DO follow repository rules for test authorization.
- When relevant regression tests exist, DO update them for each implemented fix to show that unsafe input is blocked and corresponding legitimate use succeeds.
- Only when the user explicitly requests new tests, you CAN add focused regression cases for those behaviors.
- If existing tests cannot demonstrate the boundary without new cases, DO report the coverage gap.
- PREFER assertions on observable security behavior to implementation details, call counts, exact error text, or middleware order.
- DON'T reproduce vulnerable production logic in tests.
- DO use realistic identities and trust boundaries.
- When a flaw depends on timing, DO include concurrency or transaction verification within the authorized test scope.
- DON'T send exploit traffic to production or third-party systems.
- DO keep proof cases local and minimally harmful.

## Remediation principles

PREFER applying these principles to the relevant vulnerability:

- **Secure by default:** Require an explicit decision to weaken protection.
- **Least privilege:** Grant only the data and operations needed by the principal and task.
- **Complete mediation:** Enforce security checks on each relevant path and operation.
- **Fail closed:** DON'T grant access or disable verification after a security-decision error.
- **Minimize attack surface:** Remove unnecessary exposure, dangerous interpretation, and privileged reachability.
- **Defense in depth:** Add a second control only for a realistic bypass or failure mode.
- **Single source of truth:** Centralize security invariants without unnecessary indirection.
- **Minimal complete fix:** Close the full attack path without unrelated refactoring or broad behavior changes.

DON'T silently choose product policy. If repository rules do not establish the intended policy, DO ask before materially changing roles, token lifetimes, account recovery, external access, key rotation, retention, schema compatibility, or public API contracts.

## Verification and reporting

DO run the narrowest relevant tests first, then applicable broader suites, formatting, linting, type checking, and repository-configured security checks. DO inspect the final diff for bypasses, duplicated controls, secret exposure, unsafe migrations, dependency drift, and unrelated edits.

For each confirmed finding or fix, DO report:

- severity and confidence;
- attacker capability and preconditions;
- the source-to-operation path or violated invariant;
- practical impact;
- affected files or components;
- remediation and verification performed;
- outstanding deployment, migration, revocation, or rotation steps.

DO present fixed or confirmed vulnerabilities first. DO separate unresolved findings, defense-in-depth suggestions, and unverifiable assumptions. If no high-confidence vulnerability is found, DO state that directly and summarize the reviewed paths and checks. DON'T invent findings to fill a report.

---
name: testing
description: Reviews and improves LongLink tests by removing unnecessary code and covering meaningful behavior without changing production code. Use when the user asks for test cleanup, coverage improvements, test-only implementation, or a testing review or plan.
---

# Testing

Improve confidence in important behavior with the simplest maintainable tests. Coverage identifies untested risk; it is not proof of quality or a target to maximize.

## Scope and Execution Mode

- Read production code and source contracts to understand intended behavior, but edit only tests and necessary test-local fixtures/helpers. Do not change production code, generated contracts, dependencies, or coverage configuration to make tests pass.
- Follow repository instructions and the user's requested scope. A request to review or plan is read-only; return ranked options. A request to implement, clean up, or improve tests authorizes test-only edits, including meaningful new cases.
- When the user approves listed items, implement that selection. When they ask to keep looping until done, continue through worthwhile improvements without repeated approval prompts or arbitrary batches of five.
- Ask only when ambiguity affects the implementation, a production change is necessary, or a blocker requires a user decision. Continue independent work where possible.
- Preserve concurrent edits. Use the actual loaded skill location when consulting resources; do not guess alternate skill paths.

## Evidence Before Editing

For every candidate, establish:

1. **Behavior:** Read the implementation and relevant contract. Name the concrete regression the test should detect; do not derive expectations merely by copying current implementation details.
2. **Existing protection:** Search related unit, integration, and route tests. For deletion, identify surviving assertions that protect each important invariant. For addition, confirm the behavior is genuinely missing.
3. **Failure discrimination:** Explain why the test would fail for that regression. A permission test must not pass because an object is missing; a wrong-audience token must not pass because it expired; a rejected mutation must not pass merely because it returned an error.
4. **Smallest change:** Prefer strengthening an existing test, replacing an internal mock with real behavior, or removing obsolete scaffolding before adding another scenario. Add a separate test when extending the existing one would mix unrelated behaviors.

Do not delete useful boundary or regression cases because they look repetitive. Lower-level error classification and HTTP recovery can protect different contracts. Conversely, do not repeat detailed business rules at multiple levels without a distinct boundary guarantee.

## Implementation and Verification Loop

1. Inspect working-tree changes, test instructions, suite commands, and infrastructure requirements. Track completed candidates so later passes do not propose them again.
2. Establish a baseline when implementation begins. Reuse a recent successful baseline only if it applies to the current working tree. Run from the repository root:

```bash
make test  # API, SDK, and Web
```

3. Allow sufficient command time for builds and disposable infrastructure. Distinguish test failures from collection errors, command timeouts, and unavailable infrastructure. Record which suites actually ran; do not call partial results a full baseline.
4. Prioritize high-risk missing boundaries and high-confidence simplifications. Apply a coherent batch, then run focused existing tests and applicable formatting, lint, and type checks. Report configured-check results separately from explicit checks that include otherwise excluded test files.
5. Read the diff: remove unnecessary mocks, helpers, branching, broad snapshots, and repeated setup. Confirm removed tests retain their important protection and added tests exercise real behavior. Compare setup and assertion complexity, not just test counts or line counts.
6. Continue with substantive supported candidates. Before completing implementation, run root `make test` on the final changes and review `git diff --check`. Do not rerun full suites after every trivial edit when focused checks suffice; repeat broader checks only for new changes, failures, or unresolved concerns.
7. Stop when remaining candidates are speculative, low-value, duplicative, out of scope, or blocked. Do not manufacture findings to fill a quota or claim the repository has no remaining testing risks.

Use coverage to direct investigation, not to justify a test by itself. Report actual measured totals and whether a suite emits coverage. Compare only compatible runs; flag concurrent source/test changes that prevent attribution. If passing tests exercise code still reported as uncovered, investigate collection/import/instrumentation behavior before claiming a coverage gain. Do not change coverage settings to conceal the discrepancy.

## Reporting

For review-only requests, return a numbered list of worthwhile options, with no fixed count unless requested. Each option includes:

- Exact current test file path and line range.
- The weak or redundant construct and the concrete regression/invariant at stake.
- The smallest safe test-only change and checks required before removing or replacing coverage.
- Confidence: High, Medium, or Low, based on the evidence actually gathered.
- Any shared test-fixture/call-site updates and which existing contract is protected. Do not propose production contract changes as test cleanup.

After implementation, summarize tests removed, simplified, and strengthened; important behaviors newly protected; verification results and blockers; and comparable coverage figures where available. List only substantive remaining opportunities. Do not end with another approval request when already authorized to continue autonomously.

## Testing Guidelines

Test observable behavior and important boundaries. Use the lowest test level that provides confidence:

- Many unit tests for domain rules and edge cases.
- Some integration tests for database, serialization, filesystem, queues, and external-client mappings.
- Few end-to-end tests for critical user journeys.
- Do not duplicate detailed business-rule coverage at higher test levels.

### What to Test

- Business rules, invariants, state transitions, and regressions.
- Happy paths, boundary values, invalid input, and expected failures.
- Public API contracts: status code and exact relevant response/error payload.
- Authentication and authorization as separate behaviors.
- Database constraints, transactions, and persistence queries.
- Custom validation, error handling, emitted events, and audit records when contractual.
- Time, retries, idempotency, and concurrency when they affect behavior.

### What Not to Test

- Private methods or internal call order.
- Framework or library behavior that the application has not customized.
- Trivial getters, setters, mappings, or generated CRUD with no business logic.
- Mock interactions instead of outcomes, unless the external request/event is the contract.
- Logs, metrics, timestamps, IDs, ordering, or presentation details unless contractual.
- Real external or production services in CI.
- Duplicate scenarios already covered at a lower level.

Do not write tests only to increase coverage. Coverage identifies untested risk; it is not proof of quality.

### Structure

- Use AAA comments: `# Arrange`, `# Act`, `# Assert` in Python and `// Arrange`, `// Act`, `// Assert` in TypeScript.
- Test names must describe the expected behavior.
- One test verifies one behavior.
- Keep tests deterministic, isolated, and independently executable.
- Prefer exact relevant payloads, values, error messages, and error codes. Assert contractual fields rather than entire rows or incidental serialized state.
- Avoid loops and conditionals in tests unless testing iteration or branching.
- Use async tests only for async code.
- Freeze wall-clock behavior where necessary. Construct time-sensitive inputs at execution time, using one timestamp and changing only the defect under test. Never use aging import-time tokens or fixed future expiration dates.
- Use events and controlled suspension for concurrency/cancellation instead of arbitrary sleeps. Exercise real timeout cancellation when interruption is the invariant; use bounded waits for diagnostics and always clean up tasks/resources. Do not fake timeout by raising only after the handler finishes.
- Seed randomness only when random values affect the expected outcome; use fixed domain inputs where simpler.

### Parametrization

- Use parametrization only for the same behavior across meaningful inputs.
- Keep `@pytest.mark.parametrize` on one line.
- Use separate decorators for independent dimensions.
- Extract large case sets into named constants.
- Use `pytest.param(..., id="...")` for non-obvious cases.
- Do not parameterize unrelated behaviors into one test.
- Do not collapse tests if doing so requires substantial case-specific branching, generated expected results, or elaborate shared fixtures. Avoid cartesian products with no distinct regression value and one-row parametrization that adds no clarity.

### Fixtures and Mocking

- Prefer small, composable, function-scoped fixtures, factories, and builders.
- Keep data minimal, domain-oriented, immutable where practical, and free of magic values.
- Avoid shared mutable state and test-order dependencies.
- Replace external boundaries only: HTTP transport, time, filesystem, queues, email delivery, object storage, and payment providers. Prefer real local implementations when they are deterministic and cheap; do not stub template rendering, artifact generation, or domain services merely to record calls.
- Do not mock business logic.
- For transaction recovery that cannot be triggered deterministically otherwise, a narrowly scoped stale-read or failure seam is acceptable. Keep actual constraints, flushes, savepoints, recovery queries, and commits real; document the seam and restore it. Do not manufacture an entire successful database outcome with mocked results.
- Prefer integration tests with a disposable production-compatible database for important persistence flows.
- Disposable local PostgreSQL, Ceph, and local HTTP servers are valid integration infrastructure. Never contact live provider, production, or uncontrolled external services in CI.

### FastAPI and Database Tests

- Test routes through HTTP, not by calling route functions directly.
- Assert both status code and response payload.
- Validate published error schemas, especially custom validation and exception-handler output.
- Test authentication separately from authorization.
- Use dependency overrides for authentication, external services, and test infrastructure.
- Always clear `app.dependency_overrides` after each test.
- Use transactional rollback or equivalent per-test database isolation.
- Use an independent session to prove committed outcomes, avoiding stale identity-map assertions. For rejection, verify the specific relevant mutation or queued work did not occur; allow intentional failure-state transitions.
- Use otherwise valid subjects, resources, credentials, and requests so the named boundary is the actual reason for rejection.
- Verify permission errors with stable domain errors or protocol codes, not broad exception classes. Verify protected resources exist using an authorized connection when absence could mask a permission regression.

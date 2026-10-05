---
name: testing
description: Review and improve LongLink tests by removing unnecessary code and covering meaningful behavior without changing production code. Use when the user asks for test cleanup, coverage improvements, test-only implementation, or a testing review or plan.
---

# Testing

## Task

PREFER the simplest maintainable tests that improve confidence in important behavior. Coverage identifies untested risk. It is not proof of quality or a target to maximize.

## Scope and execution mode

- DO read production code and source contracts to understand intended behavior.
- DO edit only tests and necessary test-local fixtures or helpers.
- DON'T change production code, generated contracts, dependencies, or coverage configuration to make tests pass.
- DO follow repository instructions and the user's requested scope.
- For a review or plan, DO inspect without editing and return ranked options.
- A request to implement, clean up, or improve tests authorizes test-only edits, including meaningful new cases.
- When the user approves listed items, DO implement only that selection.
- When the user asks for continued improvement until completion, DO continue through worthwhile changes without repeated approval prompts or arbitrary batch sizes.
- DO ask questions only when ambiguity affects implementation, production changes are necessary, or a blocker requires a user decision.
- Where possible, PREFER continuing independent work while a decision is pending.
- DO preserve concurrent edits.
- When consulting resources, DO use the actual loaded skill location instead of guessing alternate paths.

## Evidence before editing

For each candidate, DO establish:

1. **Behavior:** Read the implementation and relevant contract. Identify the concrete regression the test should detect. DON'T derive expectations only by copying implementation details.
2. **Existing protection:** Search related unit, integration, and route tests. Before deletion, identify surviving assertions for each important invariant. Before addition, confirm that coverage of the behavior is missing.
3. **Failure discrimination:** Explain why the test would fail for the named regression. DON'T let a permission test pass because an object is missing. DON'T let a wrong-audience token test pass because the token expired. DON'T let a rejected-mutation test pass only because it returned an error.
4. **Smallest change:** PREFER strengthening an existing test, replacing an internal mock with real behavior, or removing obsolete setup before adding another scenario. When extending a test would mix unrelated behaviors, PREFER a separate test.

DON'T delete useful boundary or regression cases only because they look repetitive. Lower-level error classification and HTTP recovery can protect different contracts. DON'T repeat detailed business rules at multiple levels without a distinct boundary guarantee.

## Implementation and verification loop

DO follow this sequence:

1. Inspect working-tree changes, test instructions, suite commands, and infrastructure requirements. Track completed candidates to avoid proposing them again.
2. At the start of implementation, establish a baseline. You CAN reuse a recent successful baseline only if it applies to the current working tree. Run from the repository root:

    ```bash
    make test  # API, SDK, and Web
    ```

3. Allow sufficient command time for builds and disposable infrastructure. Distinguish test failures, collection errors, timeouts, and unavailable infrastructure. Record which suites ran. DON'T describe partial results as a full baseline.
4. Prioritize high-risk missing boundaries and high-confidence simplifications. Apply a coherent batch. Run focused existing tests and applicable formatting, lint, and type checks. Report configured checks separately from explicit checks that include otherwise excluded test files.
5. Review the diff for unnecessary mocks, helpers, branching, broad snapshots, and repeated setup. Confirm that removed tests retain important protection and added tests exercise real behavior. Compare setup and assertion complexity, not only test counts or line counts.
6. Continue with substantive candidates supported by evidence. Before completion, run root `make test` on the final changes and review `git diff --check`. AVOID rerunning full suites after each trivial edit when focused checks suffice. PREFER repeating broader checks only for new changes, failures, or unresolved concerns.
7. Stop when remaining candidates are speculative, low-value, duplicative, out of scope, or blocked. DON'T invent findings to fill a quota or claim that no testing risks remain.

DO use coverage to direct investigation, not as the sole reason for a test. DO report measured totals and whether each suite emits coverage. DO compare only compatible runs and identify concurrent changes that prevent attribution. If passing tests exercise code reported as uncovered, DO investigate collection, import, or instrumentation behavior before claiming a coverage gain. DON'T change coverage settings to hide the discrepancy.

## Reporting

For review-only requests, DO return a numbered list of worthwhile options. Unless the user requests a count, DON'T impose a fixed count. For each option, DO include:

- Exact current test file path and line range.
- The weak or redundant construct and the concrete regression or invariant at risk.
- The smallest safe test-only change and required checks before coverage removal or replacement.
- Confidence: High, Medium, or Low, based on gathered evidence.
- Shared fixture or call-site updates and the existing contract protected.

DON'T propose production contract changes as test cleanup.

After implementation, DO summarize removed, simplified, and strengthened tests. DO include newly protected behaviors, verification results, blockers, and comparable coverage figures where available. DO list only substantive remaining opportunities. When continued work is already authorized, DON'T end with another approval request.

## Testing guidelines

DO test observable behavior and important boundaries. PREFER the lowest test level that provides confidence:

- Many unit tests for domain rules and edge cases.
- Some integration tests for databases, serialization, filesystems, queues, and external-client mappings.
- A small number of end-to-end tests for critical user journeys.

DON'T duplicate detailed business-rule coverage at higher test levels.

### What to test

PREFER coverage of relevant:

- business rules, invariants, state transitions, and regressions;
- successful operations, boundary values, invalid input, and expected failures;
- public API contracts, including status codes and exact relevant response or error payloads;
- authentication and authorization as separate behaviors;
- database constraints, transactions, and persistence queries;
- custom validation, error handling, and contractual events or audit records;
- time, retries, idempotency, and concurrency that affect behavior.

### What not to test

AVOID testing:

- private methods or internal call order;
- framework or library behavior that the application has not customized;
- trivial getters, setters, mappings, or generated CRUD without business logic;
- mock interactions instead of outcomes, unless the external request or event is the contract;
- logs, metrics, timestamps, IDs, ordering, or presentation details unless contractual;
- scenarios already covered at a lower level without a distinct boundary guarantee.

DON'T contact real external or production services in CI. DON'T write tests only to increase coverage.

### Structure

- DO use AAA comments: `# Arrange`, `# Act`, `# Assert` in Python and `// Arrange`, `// Act`, `// Assert` in TypeScript.
- DO name tests to describe expected behavior.
- DO verify one behavior in each test.
- DO keep tests deterministic, isolated, and independently executable.
- PREFER assertions on exact relevant payloads, values, error messages, and error codes.
- DO assert contractual fields instead of entire rows or incidental serialized state.
- Unless testing iteration or branching, AVOID loops and conditionals in tests.
- DO use async tests only for async code.
- When necessary, DO freeze wall-clock behavior.
- DO construct time-sensitive inputs at execution time from one timestamp, changing only the defect under test.
- DON'T use aging import-time tokens or fixed future expiration dates.
- For concurrency or cancellation, DO use events and controlled suspension instead of arbitrary sleeps.
- When interruption is the invariant, DO exercise real timeout cancellation.
- DO use bounded waits for diagnostics and clean up tasks and resources.
- DON'T simulate a timeout by raising an error only after the handler finishes.
- PREFER seeding randomness only when random values affect the expected outcome.
- When simpler, PREFER fixed domain inputs.

### Parametrization

- DO use parametrization only for the same behavior across meaningful inputs.
- DO keep `@pytest.mark.parametrize` on one line.
- DO use separate decorators for independent dimensions.
- DO extract large case sets into named constants.
- For non-obvious cases, DO use `pytest.param(..., id="...")`.
- DON'T parameterize unrelated behaviors into one test.
- If consolidation requires substantial case-specific branching, generated expected results, or elaborate shared fixtures, DON'T consolidate tests.
- AVOID Cartesian products without distinct regression value and one-row parametrization without added clarity.

### Fixtures and mocking

- PREFER small, composable, function-scoped fixtures, factories, and builders.
- DO keep data minimal and domain-oriented.
- Where practical, PREFER immutable data.
- DON'T use unexplained values.
- AVOID shared mutable state and test-order dependencies.
- DO replace only external boundaries, such as HTTP transport, time, filesystem, queues, email delivery, object storage, or payment providers.
- When deterministic and inexpensive, PREFER real local implementations.
- DON'T stub template rendering, artifact generation, or domain services only to record calls.
- DON'T mock business logic.
- For transaction recovery that cannot otherwise be triggered deterministically, you CAN use a narrowly scoped stale-read or failure seam.
- DO keep actual constraints, flushes, savepoints, recovery queries, and commits real.
- DO document and restore the seam.
- DON'T construct an entire successful database outcome with mocked results.
- For important persistence flows, PREFER integration tests with a disposable production-compatible database.
- Disposable local PostgreSQL, Ceph, and local HTTP servers are valid integration infrastructure.
- DON'T contact live providers, production, or uncontrolled external services in CI.

### FastAPI and database tests

- DO test routes through HTTP instead of calling route functions directly.
- DO assert both status code and response payload.
- DO validate published error schemas, especially custom validation and exception-handler output.
- DO test authentication separately from authorization.
- DO use dependency overrides for authentication, external services, and test infrastructure.
- After each test, DO clear `app.dependency_overrides`.
- DO use transactional rollback or equivalent per-test database isolation.
- To prove committed outcomes, DO use an independent session instead of stale identity-map assertions.
- For rejection, DO verify that the specific mutation or queued work did not occur. Intentional failure-state transitions remain valid.
- DO use otherwise valid subjects, resources, credentials, and requests so the named boundary causes rejection.
- DO verify permission errors with stable domain errors or protocol codes instead of broad exception classes.
- When absence could hide a permission regression, DO verify resource existence with an authorized connection.

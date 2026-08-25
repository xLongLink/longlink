---
name: testing
description: Reviews LongLink test code for coverage gaps and opportunities to simplify tests without changing production code. Use when the user asks to review, improve, or plan test-only changes.
---

# Testing

Review the repository for opportunities to remove unnecessary test code, reduce complexity, improve maintainability, and increase test coverage.
Return a numeric list of cleanup options:

1. Exact file path and line range.
2. The smallest safe implementation change.
3. Behavior/invariant checks required before applying it.
4. Confidence: High, Medium, or Low.
5. Whether it affects any shared contract or requires updating call sites.

Focus only on the test cases. Do not change production code.

## LongLink Coverage

Run coverage from the repository root:

```bash
make api:test  # API: main.py and src
make sdk:test  # SDK: longlink
make test      # Both packages
```

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

- Use AAA comments: `# Arrange`, `# Act`, `# Assert`.
- Test names must describe the expected behavior.
- One test verifies one behavior.
- Keep tests deterministic, isolated, and independently executable.
- Prefer exact assertions: `==`, exact payloads, and exact errors.
- Avoid loops and conditionals in tests unless testing iteration or branching.
- Use async tests only for async code.
- Freeze time instead of sleeping; seed unavoidable randomness.

### Parametrization

- Use parametrization only for the same behavior across meaningful inputs.
- Keep `@pytest.mark.parametrize` on one line.
- Use separate decorators for independent dimensions.
- Extract large case sets into named constants.
- Use `pytest.param(..., id="...")` for non-obvious cases.
- Do not parameterize unrelated behaviors into one test.

### Fixtures and Mocking

- Prefer small, composable, function-scoped fixtures, factories, and builders.
- Keep data minimal, domain-oriented, immutable where practical, and free of magic values.
- Avoid shared mutable state and test-order dependencies.
- Mock external boundaries only: HTTP, time, filesystem, queues, email, object storage, and payment providers.
- Do not mock business logic.
- Prefer integration tests with a disposable production-compatible database for important persistence flows.
- Never call real external services in CI.

### FastAPI and Database Tests

- Test routes through HTTP, not by calling route functions directly.
- Assert both status code and response payload.
- Validate published error schemas, especially custom validation and exception-handler output.
- Test authentication separately from authorization.
- Use dependency overrides for authentication, external services, and test infrastructure.
- Always clear `app.dependency_overrides` after each test.
- Use transactional rollback or equivalent per-test database isolation.

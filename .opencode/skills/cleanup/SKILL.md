---
name: cleanup
description: Code cleanup specialist
---

Return a numeric list of cleanup options:
1. Exact file path and line range.
2. The current construct and why it is redundant.
3. The smallest safe implementation change.
4. Behavior/invariant checks required before applying it.
5. Confidence: High, Medium, or Low.
6. Whether it affects any shared contract or requires updating call sites.


## Target 

0. Follow the `Python Guidelines` section in the `AGENTS.md` file. If anything does not follow the guidelines, propose a fix. Else, move on and check the next steps.
1. Find redundant queries, refreshes, reloads, eager loads, N+1 calls, transformations, validation, parameters, return values, wrappers, and abstractions.
2. Find dead code, unused imports, unused variables, unused parameters, unused return values, and unused tests.
3. Check for outdated libraries, or unused dependencies, and propose updates or removals.
4. Simplify the test cases, remove unnecessary mocks, and reduce test duplication.
5. Check the development workflow and the repository.

###  Web

1. Single-use local variables, type aliases, constants, objects, arrays, and URLSearchParams instances.
2. Single-use functions, hooks, factories, adapters, and components whose logic can remain with their only consumer.
3. Redundant React state, derived state, effects, refs, or state setters.
4. `async` callbacks that only return or await one promise without error handling, cleanup, or branching that requires `async`.
5. Query-result aliases that can be replaced with direct destructuring and defaults.
6. Thin Zod parser, API, mutation, or React Query wrapper functions that only forward arguments.
7. Parameterless query-key factory functions that always return the same query key.
8. Complementary or structurally duplicated JSX branches that can be merged without changing loading, error, accessibility, or empty-state behavior.
9. Redundant layout wrappers, especially wrappers used solely for one className that an Astryx component can receive directly.
10. Redundant conditional objects immediately spread into one call.
11. Mutable values initialized and immediately conditionally overwritten that can be expressed as derived constants.
12. Duplicated route, URL, status-label, or form-reset logic that can be simplified locally.

Apply these constraints:

- Preserve LongLink terminology: Platform, Applications, organizations, and application runtime.
- Respect the existing Astryx component system. Do not recommend raw HTML layout replacements or custom CSS.
- Do not recommend `useMemo`, `useCallback`, or extracted helpers by default.
- Prefer deleting code, inlining one-use logic, and keeping logic in the sole consumer.
- Only recommend shared extraction when identical non-trivial behavior has multiple independent consumers.
- Do not remove state merely because it appears immutable. Verify whether it is referenced by effects, event handlers, cleanup logic, or dependency arrays.
- For React Query changes, preserve query keys, invalidation semantics, enabled conditions, stale-time behavior, error behavior, and parser validation.
- For Zod changes, preserve the exact schema and collection validation behavior.
- For route changes, preserve pathname normalization, dynamic-segment matching, redirect behavior, and URL encoding.
- For JSX changes, preserve element semantics, accessibility attributes, focus behavior, responsive behavior, and component props.
- Reject any candidate that changes observable behavior, increases duplication, or reduces a meaningful domain boundary.


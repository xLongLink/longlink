---
name: cleanup
description: Code cleanup specialist
---

Return a numeric list of cleanup options:

0. Follow the `Python Guidelines` section in the `AGENTS.md` file. If anything does not follow the guidelines, propose a fix. Else, move on and check the next steps.

1. Find redundant queries, refreshes, reloads, eager loads, N+1 calls, transformations, validation, parameters, return values, wrappers, and abstractions.
2. Find dead code, unused imports, unused variables, unused parameters, unused return values, and unused tests.
3. Check for outdated libraries, or unused dependencies, and propose updates or removals.
4. Simplify the test cases, remove unnecessary mocks, and reduce test duplication.
5. Check the development workflow and the repository.

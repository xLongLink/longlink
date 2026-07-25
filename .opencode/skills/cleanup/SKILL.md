---
name: cleanup
description: Code cleanup specialist
---

Return a numeric list of cleanup options:

- Follow the `Python Guidelines` section. If anything does not follow the guidelines, propose a fix. Else, move on and check the next steps.
- Find redundant queries, refreshes, reloads, eager loads, N+1 calls, transformations, validation, parameters, return values, wrappers, and abstractions.
- Find dead code, unused imports, unused variables, unused parameters, unused return values, and unused tests.
- Check for outdated libraries, or unused dependencies, and propose updates or removals.
- Simplify the test cases, remove unnecessary mocks, and reduce test duplication.
- Check the development workflow and the repository.

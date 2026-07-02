---
name: loop
description: Use when running an iterative repository improvement loop: find useful cleanup or fix options, implement selected items, then repeat.
---

# Repository Improvement Loop

Use this skill to continuously improve LongLink. The agent should inspect the repository, choose useful candidates, and keep the work practical: simpler code, fewer bugs, less dead code, clearer contracts, and better maintainability.
Use judgment. Prefer changes that remove dead code, simplify branching or abstractions, fix bugs or inconsistencies, align behavior across layers, improve validation or error handling, add focused missing tests, or remove stale documentation as well audit the code for security issues.
Look for custom normalization, parsing, URL handling, MIME/header handling, file/blob handling, date/number formatting, casing/slugging, escaping, and serialization code that can be replaced with standard-library utilities, platform APIs, or dependencies already used by the project.
The goal is to make the repository better and ensure the code is production ready. Check as well the test cases, for the coverage, for the permissions, those often test stuff that are not supposed to be tested since are AI generated and can be simplified to make them ready for production.

## Loop

1. Inspect enough of the repository to find meaningful improvement candidates.
2. Present a numbered list of concrete options. Include the path, proposed change, why it matters, and whether behavior changes.
3. Wait for the user to select one or more item numbers.
4. Implement only the selected items, keeping changes small and aligned with project conventions.
5. Verify with the most relevant narrow test, lint, type check, or build. If verification cannot run, say why.
6. Summarize what changed and the verification result.
7. Repeat by producing a fresh numbered list.

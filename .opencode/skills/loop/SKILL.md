---
name: loop
description: Use when running an iterative repository improvement loop: find useful cleanup or fix options, implement selected items, then repeat.
---

# Repository Improvement Loop

Use this skill to continuously improve LongLink. The agent should inspect the repository, choose useful candidates, and keep the work practical: simpler code, fewer bugs, less dead code, clearer contracts, and better maintainability.

## Loop

1. Inspect enough of the repository to find meaningful improvement candidates.
2. Present a numbered list of concrete options. Include the path, proposed change, why it matters, and whether behavior changes.
3. Wait for the user to select one or more item numbers.
4. Implement only the selected items, keeping changes small and aligned with project conventions.
5. Verify with the most relevant narrow test, lint, type check, or build. If verification cannot run, say why.
6. Summarize what changed and the verification result.
7. Repeat by producing a fresh numbered list.

## Choosing Items

Use judgment. Prefer changes that remove dead code, simplify branching or abstractions, fix bugs or inconsistencies, align behavior across layers, improve validation or error handling, add focused missing tests, or remove stale documentation.


## Fixing

- Preserve unrelated user changes in the worktree.
- Avoid public behavior changes unless the selected item is a bug fix or explicit behavior improvement.
- Prefer deletion and simplification over compatibility layers or new abstractions.
- Follow repository conventions.
- Keep comments rare and only for non-obvious logic.

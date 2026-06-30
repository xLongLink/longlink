---
name: loop
description: Use when running an iterative LongLink cleanup, simplification, improvement, and misalignment loop after a feature or fix.
---

# Development Loop Audit

Use this skill to run an iterative coding loop for LongLink. The goal is to identify the next small, useful changes after a feature or fix: cleanup and simplification work, plus improvements and misalignments that make the current feature and nearby code more coherent.

## Scope

- Inspect the current feature area first, then directly related `api/`, `sdk/`, `web/`, tests, docs, or configuration files.
- Prefer small, behavior-preserving changes over broad rewrites.
- Prefer deleting obsolete code over adding compatibility layers.
- Prefer existing project conventions over new patterns.
- Do not suggest broad feature work. Improvement items must be small, directly related to the current feature or a nearby misalignment, and clear about whether behavior changes.

## Audit Workflow

1. Build context before proposing work.
2. Search the feature area and adjacent code for dead code, duplicated logic, unused exports, redundant abstractions, inconsistent naming, over-complicated branches, stale comments, mismatched API contracts, missing validation, UI/API misalignments, and test gaps.
3. Produce exactly 10 numbered items for the user to choose from.
4. Items `1.` through `5.` must be cleanup and simplification items that are behavior-preserving.
5. Items `6.` through `10.` must be improvements and misalignments. These may include small feature-related improvements, product/API/UI mismatches, missing tests, missing validation, docs drift, or inconsistencies in nearby code.
6. Include a mix of items directly related to the current feature or recent changes and items from the surrounding code that became relevant while inspecting the feature.
7. Each item must be actionable and scoped small enough to complete in one pass.
8. Include the primary file path or area in each item.
9. Prefer items that reduce code size, remove indirection, consolidate duplicate logic, simplify conditionals, normalize naming, remove obsolete flows, align contracts, or improve test coverage.
10. Do not implement anything until the user selects one or more item numbers.

## Item Format

Print exactly two short sections with numeric lists. Keep each item concise and specific:

```markdown
Cleanup And Simplification
1. `api/src/...`: Remove unused ... and update ... because ...
2. `web/src/...`: Collapse duplicated ... into ... without changing ...

Improvements And Misalignments
6. `api/src/...` and `web/src/...`: Align ... because ... Behavior change: no.
7. `web/src/...`: Add missing ... for the current feature because ... Behavior change: yes.
```

Each item should mention:

- The affected path or small group of paths.
- The cleanup, simplification, improvement, or misalignment.
- Whether the item is behavior-preserving or changes behavior.
- Why it is safe, useful, or feature-relevant.

## Selection Workflow

When the user selects one or multiple numbers:

1. Re-read the affected files before editing.
2. Implement only the selected items.
3. Keep changes minimal and behavior-preserving unless the selected improvement explicitly calls out a behavior change.
4. Remove obsolete code instead of preserving unused compatibility paths.
5. Update tests only when existing tests need adjustment or a small regression test is needed to protect behavior.
6. Run the narrowest relevant verification command available.
7. If verification cannot be run, explain why.
8. After completing the selected fixes, run the audit again and print exactly 10 new numbered items in the same two-section format.

## Fixing Rules

- Use `apply_patch` for manual edits.
- Do not change public API behavior unless the selected improvement explicitly identifies the behavior change and it is small, feature-relevant, and testable.
- Do not mix unselected cleanup or improvements into the fix.
- Preserve unrelated user changes in the worktree.
- For Python, keep two blank lines between function definitions and add docstrings to new functions.
- For JavaScript or TypeScript, add JSDoc to new functions and avoid adding new helpers unless the simplification clearly benefits from reuse.
- Keep comments rare and only for non-obvious logic.

## Audit Heuristics

Prioritize findings in this order:

1. Dead or unreachable code.
2. Duplicated API/web model shapes or request logic.
3. Inconsistent route names, client method names, data fields, status names, or runtime behavior across layers.
4. Branching that can be simplified without changing outcomes.
5. Abstractions with only one caller or no clear domain value.
6. Repeated UI/API error handling that can be normalized through an existing pattern.
7. Stale comments, TODOs, or docs that contradict current code.
8. Test setup or fixtures that duplicate existing helpers.
9. Files with mixed responsibilities that can be reduced by moving code to an existing module.
10. Generated or built assets accidentally treated as source, if present.

For improvement and misalignment items, prioritize:

1. Feature behavior that is implemented in one layer but not represented in another.
2. API responses, web clients, XML runtime behavior, or docs that no longer agree.
3. Missing validation or error states around the current feature.
4. Missing narrow tests for the feature or adjacent contract.
5. Naming, status values, labels, or routes that make the feature harder to understand.
6. Small UX or developer-experience gaps that can be fixed without redesigning the feature.

## Response After Fixes

After fixing selected items, respond with:

1. A short summary of what changed.
2. The verification command and result.
3. Exactly 10 new numbered loop items for the next selection: 5 cleanup and simplification items, then 5 improvements and misalignments.

Do not ask whether the user wants more items unless fewer than 10 valid candidates can be found.

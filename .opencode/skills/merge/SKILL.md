---
name: merge
description: Create a GitHub pull request (merge request) for your changes. Use when the user asks to publish the current work as a merge request or pull request. Do not merge it.
---

# Merge Request

## Scope

DO publish only your own changes. DO follow the commit and merge request structures in `AGENTS.md`.

## Workflow

DO complete these steps in order:

1. Read `AGENTS.md` and `.github/release.yml`. Inspect Git status, staged and unstaged diffs, recent commits, and remotes. Record the original branch or, for a detached checkout, the original commit.
2. Identify your changes from the current conversation. Preserve unrelated edits and staged work. DON'T use blanket staging, reset, automatic stashing, or force-push. If ownership or scope is unclear, ask the user.
3. Check `gh` authentication. Determine the target repository and base branch from the user's request or the repository default. Check for an existing pull request for the intended branch.
4. Use a dedicated topic branch with only the intended changes. Inspect its commits and diff against the base branch. DON'T include unrelated commits. If safe isolation is not possible, ask the user before proceeding.
5. Run relevant existing formatting, lint, type, and test checks, plus `git diff --check`. For documentation-only changes, run applicable checks. Report failures and skipped checks. DON'T claim that checks passed if they did not run.
6. Stage only owned files or hunks. Review the staged diff and commit with the structure in `AGENTS.md`. DON'T include pre-existing staged changes. If intended commits already exist, reuse them.
7. Push the topic branch with an upstream, without force. Use `gh pr create` with an explicit repository, base, head, title, and body. If a matching request exists, reuse it instead of creating a duplicate.
8. Check available labels. Apply change-type labels from `.github/release.yml` and applicable area labels (`api`, `sdk`, `web`). DO report missing labels instead of creating them without approval. DO use `skip-changelog` only for intentionally excluded changes.
9. If an isolated worktree was used, confirm that the intended commit is pushed and the pull request exists before removing duplicate published changes from the original checkout. Compare the original checkout's current diff with the published patch. Reverse only exact files or hunks you own. Preserve unrelated edits and staged work. DON'T use blanket restoration, reset, or stashing. If overlapping edits prevent safe cleanup, ask the user. If publication fails, retain unpublished work.
10. Return the local checkout to the original branch or detached commit, including after a failure. DON'T discard unpublished or unrelated changes to switch branches. If safe restoration is blocked, report the blocker. Verify that duplicate published changes are removed and unrelated work remains intact.
11. Return the pull request URL, a short summary, and validation results. Confirm checkout restoration and published-change cleanup. Report any cleanup blocker.

## Body

DO use this body structure:

```markdown
## Summary

- What changed and why.

## Validation

- Checks run and results, or why not run.
```

When applicable, DO describe breaking changes and migration steps.

Creating a request does not authorize further publication actions. Without separate authorization, DON'T merge the request, enable auto-merge, create a release, or change repository settings.

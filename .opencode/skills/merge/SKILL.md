---
name: merge
description: Create a GitHub pull request (merge request) for the agent's changes. Use when the user asks to publish the current work as a merge request or pull request; do not merge it.
---

# Merge Request

Publish only the agent's changes, following `AGENTS.md` commit and merge request structures.

## Workflow

1. Read `AGENTS.md` and `.github/release.yml`. Inspect Git status, staged and unstaged diffs, recent commits, and remotes. Record the original branch (or commit if detached).
2. Identify the agent's changes from the current conversation. Preserve unrelated edits and staged work; never use blanket staging, reset, automatic stashing, or force-push. Ask if ownership or scope is unclear.
3. Check `gh` authentication and determine the target repository and base branch from the user's request or repository default. Check for an existing pull request for the intended branch to avoid duplicates.
4. Use a dedicated topic branch containing only the intended changes. Inspect its commits and diff against the base; do not include unrelated commits. If safe isolation is not possible, ask before proceeding.
5. Run relevant existing formatting, lint, type, and test checks, plus `git diff --check`. For documentation-only changes, use applicable checks. Report failures or skipped checks honestly; do not claim checks passed when they did not run.
6. Stage only owned files or hunks, review the staged diff, and commit using the structure in `AGENTS.md`. Do not include pre-existing staged changes. Reuse intended commits if already committed.
7. Push the topic branch with an upstream, without force. Use `gh pr create` with explicit repository, base, head, title, and body; reuse an existing matching request instead of creating a duplicate.
8. Apply change-type labels from `.github/release.yml` and applicable area labels (`api`, `sdk`, `web`). Check available labels first; report missing labels rather than silently creating repository labels. Use `skip-changelog` only for intentionally excluded changes.
9. Return the local checkout to the original branch or detached commit, including after a failure. Never discard changes to switch branches; report a blocker if restoration cannot be done safely.
10. Return the pull request URL, a short summary, validation results, and confirmation of the restored checkout.

## Body

```markdown
## Summary
- What changed and why.

## Validation
- Checks run and results, or why not run.
```

Mention breaking changes and migration steps when applicable. Creating the request does not authorize merging it, enabling auto-merge, creating a release, or changing repository settings.

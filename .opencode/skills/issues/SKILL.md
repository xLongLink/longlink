---
name: issues
description: Create GitHub issues for LongLink. Use when asked to report, file, open, or create a bug, feature, task, or documentation issue.
---

# LongLink Issues

Create public GitHub issues in `xLongLink/longlink` only when the user asks to report, file, open, or create one.

## Workflow

1. Read `.github/ISSUE_TEMPLATE/*.yml` and select the form that best matches the request. Its fields, title, and issue type are authoritative.
2. Ask one concise question only if the form or a meaningful answer cannot be inferred.
3. Search all issues for duplicates with `gh issue list --repo xLongLink/longlink --state all --search "<terms>"`. Do not create a duplicate without explicit confirmation.
4. Draft a concise title and answer each form field in order using plain text without Markdown formatting.
5. Resolve the repository and issue type IDs, then use `gh api graphql` and `createIssue` with variables for the type, title, and body. Stop if the declared type is unavailable.
6. Return the issue URL or the exact blocker with the prepared title and body. Add no other metadata unless requested.

## Safety

Never create a public issue for a security vulnerability. Direct the user to GitHub private vulnerability reporting or `info@longlink.dev`, including the affected version, reproduction steps, impact, and relevant evidence.

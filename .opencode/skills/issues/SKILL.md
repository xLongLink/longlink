---
name: issues
description: Create GitHub issues for LongLink. Use when asked to report, file, open, or create a bug, feature, task, or documentation issue.
---

# LongLink Issues

Create public GitHub issues in `xLongLink/longlink` only when the user asks to report, file, open, or create one.

## Workflow

1. Read `.github/ISSUE_TEMPLATE/task.md` and use it as the source of truth for the issue title prefix and body structure. Do not invent or reference templates that are absent from the repository.
2. Extract the task description and completion criteria from the user's request. Ask one concise question only if either is required but cannot be inferred.
3. Search open and closed issues for duplicates with `gh issue list --repo xLongLink/longlink --state all --search "<relevant terms>"`. If a likely duplicate exists, give the user its URL and do not create a new issue unless they explicitly request it.
4. Write a concise, outcome-focused title using the template prefix: `[Task]: <imperative summary>`.
5. Create a body containing both required template headings. State the motivation and scope under `## Task description`, then list observable, testable outcomes under `## Completion criteria`.
6. Create the issue with `gh issue create --repo xLongLink/longlink --title "..." --body "..."`. Do not set labels, assignees, milestones, projects, or linked pull requests unless the user provides them.
7. Return the created issue URL. If GitHub authentication or permissions prevent creation, report the exact blocker and provide the prepared title and body.

## Safety

Never create a public issue for a security vulnerability. Direct the user to GitHub private vulnerability reporting or `info@longlink.dev`, including the affected version, reproduction steps, impact, and relevant evidence.

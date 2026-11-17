# LongLink Agent Guide

PRINCIPLES:
- KISS: Choose the simplest correct implementation.
- SRP / Separation of concerns: Keep responsibilities focused and ownership clear.
- High cohesion / Low coupling: Keep related behavior together and reduce unnecessary dependencies.
- YAGNI: Avoid features, abstractions, configuration, and extension points needed only for hypothetical future use.
- DRY: Avoid duplicated knowledge or business rules. AVOID abstractions that only remove superficial similarity.

GENERAL RULES:
- DO validate inputs at system boundaries.
- PREFER simple, maintainable, conventional solutions.
- NEVER create new markdown files unless indicated from the user.
- NEVER EVER EVER add any new comment in markdown files, only fix existing one.
- After creating a merge request, DO return the local checkout to its previous branch.
- When duplication improves clarity, PREFER explicit duplication to helpers or shared code.
- When they simplify implementation, PREFER the standard/established library over handwritten implementations.

TESTING:

- DO prioritize failures that matter to users: unauthorized access, data disclosure, lost updates, unusable credentials, misleading success, and broken recovery.
- Before proposing tests, DO inspect the workflow, its actors, ownership boundaries, state transitions, failure paths, and existing protection across test layers.
- Before writing a test, DO name the realistic regression it should detect and identify the observable assertion that would fail.
- DO test actual behavior with independently specified expectations instead of duplicating production logic or asserting mock configuration.
- DO cover meaningful contrasts: privileged versus restricted users, own versus another tenant's resources, and initial denial versus access revoked after data has loaded.
- DO use otherwise valid inputs and existing resources so rejection is caused by the boundary under test, not an unrelated failure.
- DO assert consequential outcomes and forbidden effects. An error response alone does not prove that no data was changed, disclosed, or queued for processing.
- DO keep the mechanism establishing the guarantee real, including authorization, database constraints, transactions, form submission, cancellation, and recovery. Replace only boundaries outside the behavior under test.
- PREFER the lowest test level that proves the contract. Add end-to-end coverage only when it protects a distinct integration boundary or user journey not already established by narrower tests.
- DON'T add trivial getter/setter tests, duplicate happy paths, or surface-level interaction tests without a concrete regression risk.
- DON'T treat line coverage, test counts, assertion counts, or mutation scores as evidence of behavioral completeness or as targets.
- DO propose only consequential, evidence-backed gaps. DON'T invent scenarios to fill a requested batch; report when fewer worthwhile candidates remain.
- DO report which behaviors were verified, which checks actually ran, and which material gaps remain. DON'T equate a passing suite with production readiness.

PYTHON:
- AVOID renaming imports.
- DO use clear domain names.
- DO FOLLOW the zen of python.
- PREFER single-word Python filenames.
- DO use exceptions for genuine errors.
- DO validate types at system boundaries.
- AVOID unnecessary `try`/`except` blocks.
- PREFER the simplest correct implementation.
- DO group Pydantic fields into commented sections.
- AVOID features needed only for hypothetical future use.
- PREFER idiomatic Python and readability over efficiency.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- PREFER namespaced module APIs to importing many related functions directly.
- DO represent application state with typed models, enums, or structured objects.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- DO order Pydantic fields within each section from the shortest name to the longest name.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- PREFER explicit duplication to a local helper, When duplication makes lifecycle code clearer.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`.
  

## JavaScript / TypeScript Guidelines

- PREFER explicit async/await.
- DO declare route response schemas.
- DO keep each page simple and standalone.
- DO use concurrency only for independent operations.
- Unless renaming improves clarity, AVOID renaming imports.
- DO clean up timers, listeners, subscriptions, and observers.
- DO keep changes small and follow existing project conventions.
- When prop types are shared or complex, DO keep named prop types.
- DO inline simple, single-use prop types and `className` expressions.
- DON'T use browsers or browser automation to inspect or verify changes.
- DO run formatting, linting, type checking, and relevant existing tests.
- When types do not make behavior clear, DO add JSDoc to TypeScript functions.
- After verification, DO review the implementation for further simplification.
- For brand logos, you CAN use custom SVG components with official brand colors.
- Unless extraction improves reuse, readability, or separation of concerns, PREFER inline logic.
- DO add a descriptive `// ...` comment before each logic block, with one blank line before the comment.
- DO keep each lookup and its immediate existence check together, with the block comment before the lookup.
- AVOID unnecessary cards, duplicated derived state, and effects that do not synchronize with external systems.
- DO return raw domain objects or primitive values without reconstructing response models solely for validation.
- AVOID single-use helpers, unnecessary abstractions, duplicated state, dead code, or unnecessarily complex solutions.
- DO use clear domain terms, concise filenames, consistent plural model names, and namespaced APIs for related factories or facades.
- DO keep React component modules limited to component and type exports; place shared contexts, hooks, and utilities in separate non-component modules, except framework-supported route exports.

## UI / LongLink components

LongLink exposes shared UI components for `.jsx` Views to use directly.

- ReUI reference: https://reui.io/llms.txt.
- shadcn/ui reference: https://ui.shadcn.com/llms.txt.
- DO reuse existing LongLink, ReUI, or shadcn/ui components before building equivalents.
- DO place custom components in a `custom` folder.
- DO preserve ReUI or shadcn/ui APIs, composition patterns, and accessibility conventions.
- DO keep reusable interactions, keyboard navigation, and focus management inside components.
- DO expose clear props, events, and composition slots so Views don't rebuild component internals.
- DO support controlled state when Views need coordination; otherwise, prefer component-owned state.
- DO centralize shared appearance through theme tokens and component variants.
- DO keep View-level styling focused on layout and application-specific presentation.
- DO keep data loading, business rules, permissions, and application-specific actions outside generic UI components.
- DO handle applicable loading, empty, error, disabled, and pending states.
- DON'T add pass-through wrappers, speculative options, or abstractions for one-off layouts.

## Commit and Merge Structure

- USE Conventional Commits for commit messages
- CHOSE a type from `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Optional scopes are `api`, `sdk`, and `web`; omit the scope for cross-area changes.

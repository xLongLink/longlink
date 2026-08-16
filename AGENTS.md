# LongLink Agent Guide

- When listing improvement suggestions, use numbered lists.
- Project is in _MVP mode - No need for backwards compatibility_
- Focus on building complex things as simple as possible. Find ways to reduce complexity when solving problems

At the end of each task, return 5 cleanup and simplfications opportunities related to the task that would result in removing code:

1. Exact file path and line range.
2. The current construct and why it is redundant.
3. The smallest safe implementation change.
4. Behavior/invariant checks required before applying it.
5. Confidence: High, Medium, or Low.
6. Whether it affects any shared contract or requires updating call sites.

## Architecture

```bash
longlink/
├── api/                          # Platform API: auth, organizations, applications, registries, orchestration
├── sdk/                          # Python SDK: application runtime, CLI, scaffolding
└── web/                          # Vite/React frontend, docs, XML runtime, API and SDK bundle modes
```

- Simplify control flow, remove dead or duplicated code, and review the final implementation for further simplifications.
- Prefer simple, maintainable, conventional solutions over clever hacks.
- Prefer standard-library or established libraries over handwritten implementations.

## Python Guidelines

- Avoid renaming imports.
- Channel YAGNI and KISS principle.
- Inline single use constants.
- Validate types at the boundary.
- Avoid `Any` and prefer precise type annotations.
- Keep the code pytonic, prefer readability over efficiency.
- Use clear domain names, prefer single-word Python filenames.
- Use `Protocol` for behavioral interfaces and dependency contracts.
- Use blank lines in functions, sparingly, to indicate logical sections.
- Surround top-level function and class definitions with two blank lines.
- Method definitions inside a class are surrounded by a single blank line.
- Represent application state with typed models, enums, or structured objects.
- Prefer namespaced module APIs, over directly importing many related functions.
- Use exceptions for genuine error conditions, avoid unnecessary `try`/`except` blocks.
- Store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`, or similar result methods.
- Use `collections.abc.Sequence` for read-only query result return types instead of `list`.

### FastAPI & Pydantic

- Declare `response_model` on FastAPI routes, let FastAPI validating response model.
- Group Pydantic fields into commented sections from shortest name to longest name within each section.

### Comments

- Add a docstring to every Python function.
- Add a descriptive `# ...` comment before each logic block and leave one blank line before the comment.

### Testing

- Test the actual implementation rather than duplicating production logic, and do not add new test cases unless explicitly requested.
- Avoid mocks and global runtime-state modifications where practical, preferring real implementations and explicit dependency boundaries.

## JavaScript / TypeScript Guidelines

- Validate inputs at system boundaries.
- Avoid any; prefer precise types, generics, unknown with narrowing, discriminated unions, and established validation libraries.
- Avoid unsafe assertions and truthiness checks when 0, false, or empty strings are valid.
- Structure and simplicity: Keep logic inline unless extraction improves reuse, readability, or separation of concerns.
- Avoid single-use helpers, unnecessary abstractions, duplicated state, dead code, and clever hacks.
- Keep changes small and follow existing project conventions.
- Functions and documentation: Keep function signatures on one line when they fit.
- Add JSDoc to JavaScript functions and to TypeScript functions when behavior is not clear from the types.
- Add a descriptive `// ...` comment before logic blocks, with one blank line before each comment.
- Keep a lookup and its immediate existence check in the same logic block; place the block comment before the lookup, not between the lookup and the `if` check.
- Use clear domain terminology, concise filenames, consistent plural model names, and namespaced APIs for related factories or facades.
- Avoid renaming imports unless it improves clarity.
- Inline simple single-use prop types and className expressions. Keep named prop types when shared or complex.
- Extract components only for meaningful UI boundaries.
- Avoid unnecessary cards, duplicated derived state, index-based keys, and effects that do not synchronize with external systems.
- Async and state: Prefer explicit async/await, handle every promise, use concurrency only when operations are independent, and clean up timers, listeners, subscriptions, and observers. Avoid global runtime-state changes unless unavoidable.
- Prefer established libraries for validation, routing, forms, dates, URLs, parsing, and internationalization when they simplify the implementation.
- Declare route response schemas and return raw domain objects or primitive values without reconstructing response models solely for validation.
- Do not add tests unless explicitly requested. Test the real implementation, avoid mocks where practical, and never duplicate production logic in tests.
- Run formatting, linting, type checking, and relevant existing tests, then review the implementation for further simplification.
- Use only `lucide-react` icons, do not use `Astryx` icons
- Each page shall be simple and standalone, prefer duplication of code where clarity benefict.

## Astryx Guidelines

CLI: run every command from `web/` as `vp exec astryx <cmd>` (shown below as `astryx ...`).

WORKFLOW — discover, don't guess. Before writing UI:

1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:

- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
search "<query>" find any component / hook / doc / template / block
component --list components by category
template --list page + block recipes
docs <topic> color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
swizzle <Name> eject component source for deep customization
upgrade --apply run after any @astryxdesign/core bump

## Commit Message Structure

<commit-message>
	<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert</type>
	<scope>api|sdk|web (optional)</scope>
	<description>A short, imperative summary of the change</description>
</commit-message>

# LongLink Agent Guide

- Project is in _MVP mode - No need for backwards compatibility - Collapse migrations_
- Use the cleanup skill.
- Focus on building complex things as simple as possible. Find ways to reduce complexity when solving problems
- Prefer simple, maintainable, conventional solutions over clever hacks.
- Prefer standard-library or established libraries over handwritten implementations.
- The direct web `isbot` dependency is intentional and may remain.


## Terminology

- Platform: Platform for building and operating process-specific business applications, managing organizations, access, infrastructure, and deployment.
- Solution: Simplest possible representation of a business process expressed as code. 
- View: XML interface definition rendered by the shared Web runtime.

## Architecture

```text
LongLink
├── Control plane
│   ├── Web + API → authentication, memberships, Views, request proxy
│   ├── Operation worker → provisioning and deployments
│   ├── Database coordinator → activity, wake/sleep, identity sync
│   └── Platform database → desired state and operation history
├── Container registry → Solution images
├── Compute registration → Kubernetes cluster
│   ├── Shared infrastructure
│   │   ├── Kourier → HTTPS routing
│   │   ├── Knative → application lifecycle and scaling
│   │   └── CloudNativePG → PostgreSQL lifecycle
│   └── Organization (many per cluster)
│       ├── Compute namespace
│       │   └── Solution (many per Organization)
│       │       ├── Knative Service → FastAPI + SDK Pods
│       │       └── Migration Jobs
│       └── Database namespace
│           └── PostgreSQL cluster + persistent volumes
│               ├── Shared identity schema
│               └── Schema + credentials per Solution
└── Storage registration → object storage
    └── Organization bucket → prefix per Solution
```


## Boundaries and Contracts

- Platform metadata is separate from Solution business data.
- Organizations own isolated namespaces, a PostgreSQL cluster, and a storage bucket; Solutions own scoped schemas, credentials, and storage prefixes.
- Compute registrations define CNPG storage and the HTTPS Kourier gateway; no external tenant database registry exists.
- Organization databases may hibernate when idle; activity wakes them and synchronizes shared users before work begins.
- Diagnostics use cached data without waking databases, and storage allocation is reported per database instance.
- Platform users and memberships flow one way into the Organization's shared schema.
- Platform, shared-schema, and Solution migrations have separate owners.
- OpenAPI generates Web API contracts; SDK XSD schemas define XML Views implemented by Web.
- Edit source contracts, not generated files, and keep implementations aligned.
- API and SDK define safe errors; shared Web reports API failures while local UI handles interaction recovery.
- XML permits declarative UI only, and frontend access controls never replace backend authorization.


## Python Guidelines

- Avoid renaming imports.
- Channel YAGNI and KISS principle.
- Prefer explicit duplication over a local helper when it makes lifecycle code clearer.
- Keep class constructions in separate, multi-line assignments before invoking their methods.
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

- Declare `response_model` on FastAPI routes, let FastAPI validating response model.
- Group Pydantic fields into commented sections from shortest name to longest name within each section.

- Add a docstring to every Python function.
- Add a descriptive `# ...` comment before each logic block and leave one blank line before the comment.


### Testing

- Test the actual implementation rather than duplicating production logic, and do not add new test cases unless explicitly requested.
- Avoid mocks and global runtime-state modifications where practical, preferring real implementations and explicit dependency boundaries.


## JavaScript / TypeScript Guidelines

- Do not use browsers or browser automation to inspect or verify changes; inspect source and run code-level checks only.
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

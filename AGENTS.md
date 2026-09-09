# LongLink Agent Guide

- Project is in _MVP mode - No need for backwards compatibility - Collapse migrations_
- Focus on building complex things as simple as possible. Find ways to reduce complexity when solving problems
- Simplify control flow, remove dead or duplicated code, and review the final implementation for further simplifications.
- Prefer simple, maintainable, conventional solutions over clever hacks.
- For a small, fixed number of collection mutations, prefer explicit single-item additions over constructing a temporary collection for a bulk update.
- For bounded, infrequent work, prefer clear iteration over query-count optimizations unless measurement shows a material cost.
- Prefer standard-library or established libraries over handwritten implementations.
- The direct web `isbot` dependency is intentional and may remain.

## Project Architecture

This section is a navigation aid, not a specification. The code is the source of truth for current behavior, contracts, configuration, and commands. Update this overview when architectural boundaries change; do not duplicate implementation details here.

### Terminology

- **LongLink (Platform):** Platform for building and operating process-specific business applications, managing organizations, access, infrastructure, and deployment.
- **Solution:** Business application owning its Python/FastAPI logic, models, migrations, and Views.
- **View:** XML interface definition rendered by the shared Web runtime.
- **Organization:** Membership and resource boundary grouping users and Solutions.

### Packages

- **API (`api/`):** FastAPI control plane for authentication, memberships, infrastructure registrations, lifecycle operations, and authorized Solution proxying. Routes validate requests, database services manage Platform state, and durable operations coordinate infrastructure changes.
- **SDK (`sdk/`):** Python application toolkit, not a Platform API client. Integrates with Solution-owned FastAPI apps, supplies request identity and database/storage context, validates and serves XML views, and provides scaffolding, migrations, and container-build tooling. Solutions run as separate services, not in-process Platform plugins.
- **Web (`web/`):** React/TypeScript Platform interface and shared XML view renderer. Builds two browser applications: the Platform UI embedded in the API and a standalone Solution shell embedded in the SDK. Python serves the production assets; public Platform pages are prerendered at build time.

### Main Flows

1. **Deploy:** SDK tooling packages a Solution as a container image. The API records the requested deployment and queues a durable operation to provision scoped resources, run Solution migrations, and start its Kubernetes workload.
2. **Use:** Browser requests pass through the Platform API, which checks the session and organization permissions before proxying to the Solution with signed user identity. The Solution executes business logic using its database/storage context. Business-specific authorization remains the Solution's responsibility.
3. **Render:** Web loads the Solution's view manifest, matches a browser route, fetches XML, and renders registered React components. XML state, queries, and actions drive interaction with Solution endpoints. Hosted views use the API proxy; standalone SDK views call the Solution directly. Browser navigation paths and backend request paths are separate.

### Boundaries and Contracts

- Platform metadata is separate from Solution business data. Organizations receive a Kubernetes namespace, PostgreSQL database, and storage bucket; Solutions receive scoped schemas, credentials, and storage prefixes within them.
- The Platform projects user/membership data into an organization-shared schema for Solutions to read. This is one-way synchronization, not a cross-database transaction. Platform, shared-schema, and Solution migrations have distinct owners.
- API OpenAPI definitions generate Web TypeScript/Zod contracts. SDK XSD schemas define and document XML views, while Web implements their browser behavior. Contract changes must stay aligned across packages; generated files are not the editing source.
- API and SDK defaults supply safe error messages and HTTP statuses. The shared Web root reports API failures centrally; local UI owns validation, success behavior, and recovery rather than API error notifications.
- XML is a restricted declarative UI language, not arbitrary HTML or JavaScript. Frontend access controls do not replace backend authorization, and SDK identity context does not independently enforce all access rules.

### Source Entry Points

| Concern                                 | Start Here                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------- |
| API composition and request boundaries  | `api/main.py`, `api/src/routes/v1/`                                        |
| Platform state and deployment lifecycle | `api/src/database/services/`, `api/src/operations/`, `api/src/kubernetes/` |
| Hosted Solution authorization           | `api/src/routes/v1/proxy.py`                                               |
| SDK integration and request context     | `sdk/longlink/app.py`, `sdk/longlink/context.py`                           |
| Solution tooling                        | `sdk/longlink/cli/`                                                        |
| Web targets and Platform routes         | `web/react-router.config.ts`, `web/src/platform/routes.ts`                 |
| Shared View runtime                     | `web/src/components/Solution.tsx`, `web/src/xml/`                          |
| Web API contract generation             | `web/openapi-ts.config.ts`                                                 |

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

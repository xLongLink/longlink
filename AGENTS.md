# LongLink Agent Guide

## General rules

- The direct Web `isbot` dependency is intentional. You CAN retain it.
- PREFER simple, maintainable, conventional solutions.
- After creating a merge request, DO return the local checkout to its previous branch.
- When they simplify implementation, PREFER the standard library or established libraries over handwritten implementations.
- DO validate inputs at system boundaries.
- DO test actual behavior instead of duplicating production logic in tests.
- Unless the user explicitly requests tests, DON'T add them.
- When duplication improves clarity, PREFER explicit duplication to helpers or shared code.
- Where practical, PREFER real implementations and explicit dependency boundaries to mocks or global runtime-state changes.
- NEVER EVER EVER add any new comment in markdown files, only fix existing one.
- NEVER create new markdown files unless indicated from the user.

## Terminology

- **Platform:** The system for building and operating process-specific business applications. It manages organizations, access, infrastructure, and deployment.
- **Solution:** The simplest representation of a business process expressed as code.
- **View:** A `.jsx` Solution interface definition rendered by the isolated shared Web runtime. Bundled Platform pages are trusted native `.tsx` modules.

## Python Guidelines

- AVOID renaming imports.
- PREFER the simplest correct implementation. AVOID features needed only for hypothetical future use.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- PREFER idiomatic Python and readability over efficiency.
- DO use clear domain names.
- PREFER single-word Python filenames.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- DO represent application state with typed models, enums, or structured objects.
- PREFER namespaced module APIs to importing many related functions directly.
- DO use exceptions for genuine errors.
- AVOID unnecessary `try`/`except` blocks.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`, or similar result methods.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- DO group Pydantic fields into commented sections.
- Within each section, DO order fields from the shortest name to the longest name.
- DO add a descriptive `# ...` comment before each logic block, with one blank line before the comment.

## JavaScript / TypeScript Guidelines

- DON'T use browsers or browser automation to inspect or verify changes.
- DO inspect source and run code-level checks instead.
- PREFER precise types, generics, `unknown` with narrowing, discriminated unions, and established validation libraries.
- Unless extraction improves reuse, readability, or separation of concerns, PREFER inline logic.
- AVOID single-use helpers, unnecessary abstractions, duplicated state, dead code, or unnecessarily complex solutions.
- DO keep changes small and follow existing project conventions.
- DO add JSDoc to JavaScript functions.
- When types do not make behavior clear, DO add JSDoc to TypeScript functions.
- DO add a descriptive `// ...` comment before each logic block, with one blank line before the comment.
- DO keep each lookup and its immediate existence check together, with the block comment before the lookup.
- DO use clear domain terms, concise filenames, consistent plural model names, and namespaced APIs for related factories or facades.
- Unless renaming improves clarity, AVOID renaming imports.
- DO inline simple, single-use prop types and `className` expressions.
- When prop types are shared or complex, DO keep named prop types.
- DO extract components only for meaningful UI boundaries.
- AVOID unnecessary cards, duplicated derived state, and effects that do not synchronize with external systems.
- PREFER explicit async/await.
- DO use concurrency only for independent operations.
- DO clean up timers, listeners, subscriptions, and observers.
- Unless unavoidable, AVOID changing global runtime state.
- DO declare route response schemas.
- DO return raw domain objects or primitive values without reconstructing response models solely for validation.
- DO run formatting, linting, type checking, and relevant existing tests.
- After verification, DO review the implementation for further simplification.
- DO use only `lucide-react` icons. DON'T use Astryx icons.
- For brand logos, you CAN use custom SVG components with official brand colors.
- DO keep each page simple and standalone.

## Astryx Guidelines

<!-- ASTRYX:START -->
Astryx v0.7.1 · 168 components
CLI: run every command as `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands, API reference, integration authoring
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

## Commit Message Structure

DO use this structure for commit messages:

```
<commit-message>
	<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert</type>
	<scope>api|sdk|web (optional)</scope>
	<description>A short, imperative summary of the change</description>
</commit-message>
```

## Merge Request Structure

DO use this structure for merge requests:

```
<merge-request>
	<title>Use the commit message structure</title>
	<summary>What changed and why</summary>
	<validation>Checks run and results, or why not run</validation>
	<labels>Change-type labels from .github/release.yml and applicable area labels: api|sdk|web</labels>
</merge-request>
```

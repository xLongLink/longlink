# LongLink Agent Guide

## General rules

- The direct Web `isbot` dependency is intentional. You CAN retain it.
- PREFER simple, maintainable, conventional solutions.
- After creating a merge request, DO return the local checkout to its previous branch.
- PREFER the standard library or established libraries to handwritten implementations.

## Terminology

- **Platform:** The system for building and operating process-specific business applications. It manages organizations, access, infrastructure, and deployment.
- **Solution:** The simplest representation of a business process expressed as code.
- **View:** A `.jsx` Solution interface definition rendered by the isolated shared Web runtime. Bundled Platform pages are trusted native `.tsx` modules.

## Python Guidelines

- AVOID renaming imports.
- PREFER the simplest correct implementation. AVOID features needed only for hypothetical future use.
- When duplication makes lifecycle code clearer, PREFER explicit duplication to a local helper.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- DO validate types at system boundaries.
- PREFER idiomatic Python and readability over efficiency.
- DO use clear domain names.
- PREFER single-word Python filenames.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- PREFER sparse blank lines to separate logical sections in functions.
- DO separate method definitions in a class with one blank line.
- DO represent application state with typed models, enums, or structured objects.
- PREFER namespaced module APIs to importing many related functions directly.
- DO use exceptions for genuine errors.
- AVOID unnecessary `try`/`except` blocks.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`, or similar result methods.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- DO group Pydantic fields into commented sections.
- Within each section, DO order fields from the shortest name to the longest name.
- DO add a docstring to every Python function.
- DO add a descriptive `# ...` comment before each logic block, with one blank line before the comment.
- DO test the actual implementation instead of duplicating production logic in tests.
- Unless the user explicitly requests new test cases, DON'T add them.
- Where practical, PREFER real implementations and explicit dependency boundaries to mocks or global runtime-state changes.

## JavaScript / TypeScript Guidelines

- DON'T use browsers or browser automation to inspect or verify changes.
- DO inspect source and run code-level checks instead.
- DO validate inputs at system boundaries.
- PREFER precise types, generics, `unknown` with narrowing, discriminated unions, and established validation libraries.
- Unless extraction improves reuse, readability, or separation of concerns, PREFER inline logic.
- AVOID single-use helpers, unnecessary abstractions, duplicated state, dead code, or unnecessarily complex solutions.
- DO keep changes small and follow existing project conventions.
- DO add JSDoc to JavaScript functions.
- When types do not make behavior clear, DO add JSDoc to TypeScript functions.
- DO add a descriptive `// ...` comment before each logic block, with one blank line before the comment.
- DO keep a lookup and its immediate existence check in the same logic block.
- DO put the block comment before the lookup, not between the lookup and the `if` check.
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
- When they simplify implementation, PREFER established libraries for validation, routing, forms, dates, URLs, parsing, and internationalization.
- DO declare route response schemas.
- DO return raw domain objects or primitive values without reconstructing response models solely for validation.
- Unless the user explicitly requests tests, DON'T add them.
- DO test the real implementation. DON'T duplicate production logic in tests.
- Where practical, AVOID mocks.
- DO run formatting, linting, type checking, and relevant existing tests.
- After verification, DO review the implementation for further simplification.
- DO use only `lucide-react` icons. DON'T use Astryx icons.
- For brand logos, you CAN use custom SVG components with official brand colors.
- DO keep each page simple and standalone.
- When duplication improves clarity, PREFER it to shared code.

## Astryx Guidelines

DO run every Astryx command from `web/` as `vp exec astryx <cmd>`. The examples below abbreviate this prefix as `astryx`.

### Discovery workflow

Before writing UI, DO complete these steps in order:

1. Run `astryx build "<idea>"` to find the closest page, blocks, and components. Without arguments, the command returns the full playbook.
2. Run `astryx template <name> [--skeleton]` for the suggested page and blocks. DO use templates as reference code for scaffolding or layout study.
3. Run `astryx component <Name>` to inspect the props and examples for each component used.

### Layout and styling

- DO use components for layout and spacing, not raw `<div>` elements.
- DO use `AppShell` for full pages and `SideNav` for sidebar navigation.
- Before writing content, DO select the shell (`AppShell` or `Layout` with `LayoutPanel`) and plan region sizes in pixels using `astryx docs layout`.
- DO display dense data as edge-to-edge rows with `Table` or `List`/`Item`.
- DON'T wrap list items in `Card`.
- DO use `Card` only for dashboard widgets, galleries, or settings groups.
- DO use `StatusDot` or `Token` for status.
- DO use `Badge` only for counts or enumerated states, not decoration.
- DO use component props before custom styling.
- When props are insufficient, DO use token-backed Tailwind utilities from `tailwind-theme.css`, such as `bg-surface`, `text-primary`, or `rounded-lg`.
- DON'T use raw hexadecimal colors or pixel values in custom styles.
- DO use tokens for style values and consult `astryx docs tokens`.
- DO configure brand and accent colors through `astryx theme`.
- DON'T override `--color-*` in `:root`.

### Final review

Before completing UI work, DO reread each changed file and replace:

- `style={{…}}`;
- raw `<div>` or `<span>` layout;
- imported `.css` or `@apply` styling;
- hardcoded or arbitrary values, such as `bg-[#fff]` or `p-[13px]`.

DO use a component or token-backed utility for each replacement. When a component or prop is uncertain, DO run `astryx component <Name>` or `astryx search "<thing>"`. DON'T write custom CSS to bypass discovery.

### Command reference

| Command                   | Purpose                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astryx search "<query>"` | Find a component, hook, document, template, or block.                                                                                                                              |
| `astryx component --list` | List components by category.                                                                                                                                                       |
| `astryx template --list`  | List page and block recipes.                                                                                                                                                       |
| `astryx docs <topic>`     | Read documentation for color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, or typography. |
| `astryx swizzle <Name>`   | Export component source for deep customization.                                                                                                                                    |

After each `@astryxdesign/core` version increase, DO run `astryx upgrade --apply`.

## Commit Message Structure

DO use this structure for commit messages:

<commit-message>
	<type>feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert</type>
	<scope>api|sdk|web (optional)</scope>
	<description>A short, imperative summary of the change</description>
</commit-message>

## Merge Request Structure

DO use this structure for merge requests:

<merge-request>
	<title>Use the commit message structure</title>
	<summary>What changed and why</summary>
	<validation>Checks run and results, or why not run</validation>
	<labels>Change-type labels from .github/release.yml and applicable area labels: api|sdk|web</labels>
</merge-request>

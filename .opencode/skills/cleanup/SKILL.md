---
name: cleanup
description: Review or implement structural cleanup in LongLink, prioritizing unnecessary layers, duplicated workflows, unused state, and overcomplex logic. Use when the user asks to simplify, refactor, or remove unnecessary code while preserving intended behavior.
---

## Task

Inspect the repository for high-confidence simplifications that remove unnecessary concepts and maintenance obligations, not merely lines of code. Preserve intended behavior unless the user explicitly approves a contract or behavior change.

Honor the requested mode:

- **Review, find, or report:** inspect and present candidates without editing files.
- **Implement or refactor:** complete the requested or selected changes across affected callers and contracts, then verify them.
- Treat selection of numbered findings as approval for those findings, not permission for unrelated refactoring. Present newly discovered opportunities separately.

## Structural review first

Prioritize these opportunities, in order:

1. Remove unused capabilities, persisted state, and production contracts.
2. Remove unnecessary layers and representation conversions.
3. Consolidate duplicated workflow and resource ownership.
4. Simplify state, business modes, admission rules, and control flow.
5. Reduce repeated external work and unnecessary data loading.
6. Address local syntax, collections, formatting, and naming.

Prefer a change that eliminates a concept, state owner, contract, workflow step, or abstraction over one that merely shortens its implementation. Do not fill a review with collection or syntax rewrites when the user asks for meaningful simplification. Rank candidates by conceptual reduction, maintenance benefit, and evidence of safety rather than line count. Report fewer candidates when evidence is insufficient; do not manufacture findings to meet a quota.

### Patterns to investigate

These are investigation prompts, not automatic reasons to remove code:

| Pattern | Structural opportunity |
| --- | --- |
| Adapters that only translate APIs | Remove JSX marker parsing or forwarding classes when callers can use the established library's typed API directly. Retain meaningful validation and domain behavior. |
| Paired APIs without independent consumers | Consolidate a hook/controller and companion component when every caller immediately reconnects the same pair. Give the workflow one owner. |
| Duplicated resource ownership | Let one scope own HTTP clients, SQL connections, transactions, tunnels, and cleanup; let collaborators operate on those resources. |
| Manually coordinated resets | Give attempt-local state a clear component or operation lifetime instead of resetting multiple owners on every completion path. Preserve retry drafts and closing effects. |
| Duplicated creation contracts | Pass an existing validated model through a service instead of unpacking it into a mirrored parameter list and reconstructing it without transformation. Keep server-owned fields excluded. |
| Write-only persisted state | Trace fields that are stored, serialized, protected, and tested but never read for an application decision. Remove supporting schema and fixture code only with the retention implications understood. |
| Derivable contract fields | Investigate values always computed from another authoritative field. Check independent external producers before removing the transmitted field or its validation. |
| Repeated mandatory follow-up work | Move a transactional obligation into the operation that requires it when all callers perform the same follow-up. Preserve lock order and commit ownership. |
| Overlapping query ownership | Resolve route or tenant identity once, then give dependent queries explicit inputs. Preserve parallel fetching, cancellation, polling, and loading/error semantics. |
| Interacting flags | Replace boolean combinations with explicit business modes when the caller set proves that the flags encode mutually exclusive policies. |
| Single-caller workflow bodies | Inline forwarding boundaries when doing so exposes the lifetime and ordering of the operation more clearly. Do not trade useful separation for excessive nesting. |
| Competing production entry points | Consolidate parsers or facades with different contracts when only one is needed in production; keep fixture conveniences in test helpers. |

### Evidence required

For each candidate:

1. Trace producers, consumers, direct and indirect callers, tests, and relevant documentation. Account for framework discovery, generated contracts, scripts, migrations, and external consumers. A text search alone does not prove an API is unused.
2. Identify the distinct responsibility the existing layer, field, state, or check provides. Explain why current consumers do not need it, and what concept or maintenance obligation disappears.
3. Define the smallest **complete** change, including affected callers, source contracts, generated outputs, fixtures, and obsolete code. Do not leave parallel implementations or introduce another forwarding layer to preserve the old shape unnecessarily.
4. Compare success, failure, cancellation, retry, and concurrent behavior. Trace resource acquisition and cleanup order, transaction boundaries, state freshness, UI mounting/focus, and error precedence where relevant.
5. Identify existing verification and coverage gaps. Distinguish equivalence established by source/caller tracing from behavior exercised by tests.

A single caller does not automatically make a helper unnecessary. An abstraction may earn its place through readability, ownership, or a real boundary even with one implementation. Prefer explicit duplication over an extraction that only makes code look uniform.

Repeated checks are not redundant when a wait, external operation, transaction boundary, or trust boundary occurs between them. Preserve authorization rechecks, post-admission snapshots, lease fencing, controller acknowledgement, quota enforcement, and failure cleanup unless equivalence is demonstrated. Do not simplify a state machine by deleting transitions that appear unused only in happy-path tests.

### Compatibility and approval

Separate **behavior-preserving internal simplifications** from changes to public signatures, manifest shapes, schemas, data retention, externally observable behavior, or supported integrations. Obtain explicit approval for the latter when not already included in the request.

For example, removing a write-only Revision metadata column still changes historical retention and existing-database deployment. Removing a route-derived View field still changes the manifest contract for external producers. Neither is entirely behavior-neutral merely because current repository consumers can be migrated.

Follow the project's MVP and collapsed-migration conventions, but explain what existing installations need. Changing an initial migration does not upgrade an already-stamped database. Do not perform live destructive schema operations or silently choose retention or compatibility policy as cleanup.

## Secondary checklist

Use this checklist after tracing structural opportunities, or for a specifically requested local cleanup.

### 0. Project conventions

Read and follow `AGENTS.md`, including the `Python Guidelines`, and any more specific instructions governing the files. Apply the relevant JavaScript/TypeScript and UI conventions as well. Follow repository rules for tests and delegation rather than introducing blanket requirements.

Find violations or unnecessary deviations involving:

- naming, typing, imports, logging, exceptions;
- async/sync patterns;
- database/ORM usage;
- testing conventions;
- module organization;
- formatting, linting, and dependency management.

### 1. Redundant work

Find unnecessary or repeated:

- database queries, N+1 queries, eager/lazy loads and prefetches;
- refreshes, reloads, saves, flushes, commits, retries;
- API, network, filesystem, cache, or lookup operations;
- parsing, serialization, transformations, filtering, sorting, copying, or conversions;
- computation, object construction, collection materialization, and allocations;
- validation, authorization, existence checks, defensive checks, synchronization, or transaction boundaries.
- early returns, short-circuiting, and guard clauses that can be simplified or removed.

### 2. Dead and unused code

- dead or unreachable branches;
- unused imports, variables, constants, parameters, return values, functions, classes, modules, fixtures, helpers, factories, attributes, and exports;
- obsolete feature flags, compatibility shims, configuration, CLI options, environment variables, and deprecation paths;
- commented-out code, stale suppressions, and write-only state.

### 3. Complexity and code smells

- excessive nesting and branching;
- redundant conditionals or `else` blocks;
- complex boolean logic and flag arguments;
- long functions/classes and god objects;
- duplicate logic and business rules;
- needless wrappers, forwarding methods, adapters, service layers, repositories, factories, or indirection;
- speculative generality and premature abstraction;
- primitive obsession, data clumps, long parameter lists, and magic values;
- feature envy, inappropriate intimacy, message chains, and leaky abstractions;
- shotgun surgery, divergent change, temporal coupling, hidden coupling, and shared mutable state;
- surprising side effects or unclear ownership/state transitions.

Prefer explicit control flow, clear ownership, high cohesion, and low coupling.

### 4. APIs and contracts

- unused, redundant, derivable, optional, variadic, or always-identical parameters;
- boolean flags and overly broad configuration objects;
- unused or unnecessarily rich return values;
- obsolete signatures, overloads, callbacks, hooks, or extension points;
- unnecessarily public helpers or duplicated entry points.

### 5. Error handling and validation

- overly broad, duplicated, swallowed, or immediately re-raised exceptions;
- unnecessary `try` blocks or fallback paths;
- exceptions used unnecessarily for control flow;
- redundant assertions, `None` checks, validation, or defensive checks;
- error translation or wrappers with no semantic value.

### 6. Dependencies

- unused or duplicate dependencies;
- direct dependencies that are only transitive;
- deprecated, obsolete, or unmaintained libraries;
- libraries replaceable by the standard library;
- unnecessary dependencies used for trivial functionality;
- stale or overly restrictive version constraints;
- outdated versions where upgrading has a concrete maintenance, compatibility, security, or simplification benefit.

### 7. Tests

- duplicated test cases and setup;
- unnecessary mocks, patches, fixtures, factories, helpers, and snapshots;
- brittle implementation-detail, ordering, or call-count assertions;
- stale skipped/xfailed tests;
- excessive parametrization or missed opportunities for useful parametrization;
- tests that reproduce production logic;
- overlapping unit/integration coverage with no distinct purpose.

### 8. Architecture

- service, manager, repository, factory, builder, adapter, decorator, or dependency-injection layers;
- single-implementation interfaces or abstractions;
- hypothetical extension points with no consumers;
- modules split too finely or grouped without cohesion;
- circular dependencies and generic `utils`, `helpers`, or `common` modules that obscure ownership.

## Principles

Apply these pragmatically:

- **KISS** - prefer the simplest implementation that correctly solves the problem.
- **DRY** - avoid duplicated knowledge or business rules, but do not create abstractions solely to eliminate superficial code similarity.
- **YAGNI** - remove or avoid functionality, abstractions, configurability, and extension points that exist only for hypothetical future needs.
- **SRP / Separation of concerns** - keep responsibilities focused and ownership clear.
- **High cohesion / Low coupling** - keep related behavior together and minimize unnecessary dependencies.
- **Locality of behavior** - keep logic close to the data and concepts it operates on.
- **Information hiding** - avoid exposing implementation details unnecessarily.

## Implementation and verification

- Inspect the current working tree before editing and preserve unrelated or concurrent changes. Confirm that a previously reported candidate still matches the current implementation.
- Implement complete selected changes with clear ownership and conventional APIs. Edit source contracts and regenerate their outputs using repository commands when necessary.
- Follow repository testing rules. Adapt relevant existing tests to the new owner or API while retaining observable behavior assertions; do not weaken tests merely to accommodate a refactor or preserve dead implementation details through mocks.
- Run the narrowest relevant existing tests first, then applicable formatting, linting, type checks, builds, and broader suites. Use code-level checks for UI changes; follow the prohibition on browser verification.
- Review the final diff for missing callers, duplicated old/new paths, accidental contract changes, altered resource lifetimes, and unrelated edits. Recheck whether the result actually reduces concepts or maintenance effort.
- Report exact verification results, skips, failures, and coverage limits. A passing general suite does not establish direct coverage of dialog interactions or coordinator races. State required migration or coordinated deployment steps separately.

## Reporting candidates

For each recommendation, provide:

- **Location:** exact current file paths and line ranges.
- **Current design:** the workflow, state, contract, or abstraction under review.
- **Evidence of redundancy:** caller/consumer evidence and the responsibility that is unnecessary.
- **Smallest complete change:** what to remove or consolidate and which callers must change.
- **Benefit:** the concept, duplicate policy, or maintenance obligation eliminated.
- **Behavior and compatibility:** invariants to preserve, potential observable differences, and any approval or deployment requirement.
- **Confidence and verification:** why the recommendation is safe, relevant existing tests, and remaining uncertainty.

Lead with the strongest structural candidates. Keep smaller local cleanups and speculative opportunities separate. After implementation, summarize completed changes and checks; present any further findings as unimplemented options rather than extending the scope automatically.

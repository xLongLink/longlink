---
name: cleanup
description: Review or implement structural cleanup in LongLink. Prioritize unnecessary layers, duplicated workflows, unused state, and overly complex logic. Use when the user asks to simplify, refactor, or remove unnecessary code while preserving intended behavior.
---

# Cleanup

## Task and scope

DO inspect for high-confidence simplifications that remove unnecessary concepts and maintenance work, not only lines of code. Unless the user explicitly approves a contract or behavior change, DO preserve intended behavior.

- For a review, search for findings, or report, DO inspect and present candidates without editing files.
- For implementation or refactoring, DO complete the requested or selected changes across affected callers and contracts, then verify them.
- Selection of numbered findings authorizes only those findings. DO present newly discovered opportunities separately instead of extending the refactoring scope.

## Structural review first

DO prioritize opportunities in this order:

1. Remove unused capabilities, persisted state, and production contracts.
2. Remove unnecessary layers and representation conversions.
3. Consolidate duplicated workflows and resource ownership.
4. Simplify state, business modes, admission rules, and control flow.
5. Reduce repeated external work and unnecessary data loading.
6. Address local syntax, collections, formatting, and naming.

PREFER changes that remove a concept, state owner, contract, workflow step, or abstraction to changes that only shorten code. For meaningful simplification requests, DON'T fill reviews with collection or syntax rewrites. DO rank candidates by conceptual reduction, maintenance benefit, and evidence of safety, not line count. When evidence is insufficient, DO report fewer candidates instead of inventing findings to meet a quota.

### Patterns to investigate

These patterns are investigation prompts. They do not, by themselves, justify code removal.

| Pattern                                   | Investigation                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapters that only translate APIs         | Check whether callers can use the established library's typed API instead of JSX marker parsing or forwarding classes. Preserve meaningful validation and domain behavior.             |
| Paired APIs without independent consumers | Check whether a hook/controller and companion component always reconnect. Consider one workflow owner.                                                                                 |
| Duplicated resource ownership             | Check whether one scope can own HTTP clients, SQL connections, transactions, tunnels, and cleanup while collaborators use those resources.                                             |
| Manually coordinated resets               | Check whether attempt-local state can use a component or operation lifetime instead of resets across multiple owners. Preserve retry drafts and closing effects.                       |
| Duplicated creation contracts             | Check whether a validated model can pass through a service without unpacking and reconstructing an equivalent model. Keep server-owned fields excluded.                                |
| Write-only persisted state                | Trace fields stored, serialized, protected, and tested but never used for application decisions. Understand retention effects before removing schema or fixture code.                  |
| Derivable contract fields                 | Check whether a value always comes from another authoritative field. Check external producers before removing the transmitted field or validation.                                     |
| Repeated mandatory follow-up work         | Check whether a transactional obligation belongs in the operation that requires it. Preserve lock order and commit ownership.                                                          |
| Overlapping query ownership               | Check whether route or tenant identity can be resolved once and passed explicitly to dependent queries. Preserve parallel fetching, cancellation, polling, and loading/error behavior. |
| Interacting flags                         | Check whether callers prove that boolean combinations encode mutually exclusive business policies. Consider explicit business modes.                                                   |
| Single-caller workflow bodies             | Check whether removing a forwarding boundary clarifies operation lifetime and order. Preserve useful separation and avoid excessive nesting.                                           |
| Competing production entry points         | Check whether production needs parsers or facades with different contracts. Keep fixture conveniences in test helpers.                                                                 |

### Evidence required

For each candidate, DO complete these checks:

1. Trace producers, consumers, direct and indirect callers, tests, and relevant documentation. Account for framework discovery, generated contracts, scripts, migrations, and external consumers. A text search alone does not prove that an API is unused.
2. Identify the distinct responsibility of the layer, field, state, or check. Explain why current consumers do not need it and which concept or maintenance obligation disappears.
3. Define the smallest complete change, including callers, source contracts, generated outputs, fixtures, and obsolete code. DON'T leave parallel implementations or add unnecessary forwarding layers to retain the old structure.
4. Compare success, failure, cancellation, retry, and concurrent behavior. Where relevant, trace resource acquisition and cleanup, transactions, state freshness, UI mounting/focus, and error precedence.
5. Identify existing verification and coverage gaps. Distinguish equivalence established by source and caller tracing from behavior exercised by tests.

A helper with one caller can still improve readability, ownership, or separation. DON'T treat a single caller as sufficient evidence for removal. PREFER explicit duplication to extraction that only makes code look uniform.

Checks separated by a wait, external operation, transaction, or trust boundary can protect different states. Unless equivalence is demonstrated, DO preserve authorization rechecks, post-admission snapshots, lease fencing, controller acknowledgement, quotas, and failure cleanup. DON'T delete state-machine transitions only because successful-operation tests do not use them.

### Compatibility and approval

DO separate behavior-preserving internal changes from changes to public signatures, manifests, schemas, retention, observable behavior, or supported integrations. Unless the user's request already authorizes those changes, DO obtain explicit approval.

Removing a write-only Revision metadata column changes historical retention and existing-database deployment. Removing a route-derived View field changes the manifest contract for external producers. Migrating repository consumers does not make either change behavior-neutral.

DO follow project MVP and collapsed-migration conventions. DO explain requirements for existing installations. Changing an initial migration does not upgrade an already-stamped database. DON'T perform live destructive schema operations or silently choose retention or compatibility policy as cleanup.

## Secondary checklist

PREFER using this checklist after structural review or for specifically requested local cleanup. Each item is a candidate for investigation, not an automatic instruction to remove code.

### 0. Project conventions

DO read and follow `AGENTS.md`, including its Python Guidelines and more specific instructions for affected files. DO apply relevant JavaScript/TypeScript and UI conventions. DO follow repository testing and delegation rules instead of adding blanket requirements.

PREFER checking naming, typing, imports, logging, exceptions, async/sync patterns, database/ORM usage, testing, module organization, formatting, linting, and dependency management.

### 1. Redundant work

PREFER investigating unnecessary or repeated:

- database queries, N+1 queries, eager/lazy loads, and prefetches;
- refreshes, reloads, saves, flushes, commits, and retries;
- API, network, filesystem, cache, and lookup operations;
- parsing, serialization, transformations, filtering, sorting, copying, and conversions;
- computation, construction, collection materialization, and allocations;
- validation, authorization, existence checks, defensive checks, synchronization, and transaction boundaries;
- early returns, short-circuiting, and guard clauses.

### 2. Dead and unused code

PREFER investigating:

- dead or unreachable branches;
- unused imports, variables, constants, parameters, return values, functions, classes, modules, fixtures, helpers, factories, attributes, and exports;
- obsolete flags, compatibility layers, configuration, CLI options, environment variables, and deprecation paths;
- commented-out code, stale suppressions, and write-only state.

### 3. Complexity

PREFER investigating:

- excessive nesting and branching;
- redundant conditionals or `else` blocks;
- complex boolean logic and flag arguments;
- long functions/classes or objects with too many responsibilities;
- duplicated logic and business rules;
- unnecessary wrappers, forwarding methods, adapters, services, repositories, factories, or indirection;
- speculative generality and premature abstraction;
- primitive values used instead of domain types, recurring groups of data, long parameter lists, and unexplained values;
- methods that depend mainly on another object's data, excessive access to another object's internals, method-call chains, and abstractions that expose implementation details;
- changes spread across unrelated modules, modules with unrelated reasons to change, order-dependent operations, hidden coupling, and shared mutable state;
- surprising side effects or unclear ownership and state transitions.

PREFER explicit control flow, clear ownership, high cohesion, and low coupling.

### 4. APIs and contracts

PREFER investigating:

- unused, redundant, derivable, optional, variadic, or always-identical parameters;
- boolean flags and overly broad configuration objects;
- unused or unnecessarily detailed return values;
- obsolete signatures, overloads, callbacks, hooks, or extension points;
- unnecessarily public helpers or duplicated entry points.

### 5. Error handling and validation

PREFER investigating:

- overly broad, duplicated, swallowed, or immediately re-raised exceptions;
- unnecessary `try` blocks or fallbacks;
- exceptions used unnecessarily for control flow;
- redundant assertions, `None` checks, validation, or defensive checks;
- error translations or wrappers without distinct meaning.

### 6. Dependencies

PREFER investigating:

- unused or duplicate dependencies;
- direct dependencies needed only transitively;
- deprecated, obsolete, or unmaintained libraries;
- libraries replaceable by the standard library;
- unnecessary dependencies for trivial functionality;
- stale or overly restrictive version constraints;
- outdated versions where an upgrade provides a concrete maintenance, compatibility, security, or simplification benefit.

### 7. Tests

PREFER investigating:

- duplicated cases and setup;
- unnecessary mocks, patches, fixtures, factories, helpers, and snapshots;
- brittle implementation-detail, ordering, or call-count assertions;
- stale skipped/xfailed tests;
- excessive parametrization or useful missing parametrization;
- tests that reproduce production logic;
- overlapping unit/integration coverage without a distinct purpose.

### 8. Architecture

PREFER investigating:

- service, manager, repository, factory, builder, adapter, decorator, or dependency-injection layers;
- single-implementation interfaces or abstractions;
- hypothetical extension points without consumers;
- modules split too finely or grouped without cohesion;
- circular dependencies and generic `utils`, `helpers`, or `common` modules that obscure ownership.

## Principles

Where they improve the current design, PREFER applying these principles:

- **KISS:** Choose the simplest correct implementation.
- **DRY:** Avoid duplicated knowledge or business rules. AVOID abstractions that only remove superficial code similarity.
- **YAGNI:** Avoid features, abstractions, configuration, and extension points needed only for hypothetical future use.
- **SRP / Separation of concerns:** Keep responsibilities focused and ownership clear.
- **High cohesion / Low coupling:** Keep related behavior together and reduce unnecessary dependencies.
- **Locality of behavior:** Keep logic close to its data and domain concepts.
- **Information hiding:** Avoid unnecessary exposure of implementation details.

## Implementation and verification

- Before editing, DO inspect the working tree and preserve unrelated or concurrent changes.
- DO confirm that previously reported candidates still match the current implementation.
- DO complete selected changes with clear ownership and conventional APIs.
- When necessary, DO edit source contracts and regenerate outputs with repository commands.
- DO follow repository testing rules.
- DO adapt relevant existing tests to the new owner or API while retaining observable behavior assertions.
- DON'T weaken tests only to accommodate a refactor or preserve dead implementation details through mocks.
- DO run the narrowest relevant existing tests first, then applicable formatting, linting, type checks, builds, and broader suites.
- For UI changes, DO use code-level checks. DON'T use browser verification.
- DO review the final diff for missing callers, duplicated old/new paths, accidental contract changes, altered resource lifetimes, and unrelated edits.
- DO recheck that the result reduces concepts or maintenance effort.
- DO report exact verification results, skips, failures, and coverage limits.
- DON'T treat a passing general suite as direct coverage of dialog interactions or coordinator races.
- DO state required migration or coordinated deployment steps separately.

## Reporting candidates

For each recommendation, DO include:

- **Location:** Exact current file paths and line ranges.
- **Current design:** The workflow, state, contract, or abstraction under review.
- **Evidence of redundancy:** Consumer evidence and the unnecessary responsibility.
- **Smallest complete change:** What to remove or consolidate and which callers must change.
- **Benefit:** The concept, duplicate policy, or maintenance obligation removed.
- **Behavior and compatibility:** Preserved invariants, potential observable differences, and approval or deployment requirements.
- **Confidence and verification:** Evidence of safety, relevant existing tests, and remaining uncertainty.

DO present the strongest structural candidates first. DO separate smaller local changes and speculative opportunities. After implementation, DO summarize completed changes and checks. DO present further findings as unimplemented options instead of extending scope automatically.

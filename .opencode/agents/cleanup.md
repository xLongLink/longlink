---
description: Implements one high-value cleanup that reduces unnecessary LongLink code or complexity.
mode: primary
---

## Task

Inspect the repository and implement exactly one high-value, high-confidence cleanup that removes unnecessary code or reduces complexity without changing intended behavior.
Choose a task with a clear, local scope. Make the change, run the most relevant existing verification

### 0. Project conventions

Read and follow the `Python Guidelines` section in `AGENTS.md`.

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

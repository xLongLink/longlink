---
name: xml
description: Guide LongLink XML component creation and maintenance across SDK, web runtime, tests, and docs
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: fullstack
---

## What I do

- Give a concrete, end-to-end maintenance map for LongLink XML components across **SDK + Web + Docs**.
- Tell agents exactly **where to implement a new component** and **where to update existing components**.
- Define the minimum update checklist for implementation, test coverage, and documentation.
- Keep XML work aligned with LongLink architecture boundaries and current MVP development model.

## When to use me

Use this skill whenever the task involves any of the following:

- Adding a new XML tag or attribute.
- Changing behavior of an existing XML component.
- Updating XML parsing, rendering, binding, or schema constraints.
- Fixing XML runtime regressions.
- Auditing whether XML changes were fully propagated across code, tests, and docs.

## Source-of-truth map for XML work

### 1) SDK side (definition + packaging + SDK tests)

Primary areas:

- `sdk/longlink/.static/xsd/` → XML schema definition (component/tag/attribute contract).
- `sdk/longlink/` → SDK runtime or helper logic tied to XML integration.
- `sdk/tests/xml/` → SDK-side XML behavior and validation tests.
- `sdk/sample/src/pages/` → example XML pages used as practical references/fixtures.

What to maintain:

- Schema additions/changes for new tags and attributes.
- Any SDK code paths that consume, validate, transform, or expose XML behavior.
- Tests that prove SDK XML behavior is correct and backward assumptions are removed when obsolete.
- Sample pages when they are the canonical example for new behavior.

### 2) Web side (renderer + component implementation + web tests)

Primary areas:

- `web/src/xml/` → XML runtime parser/renderer and domain groupings:
  - `web/src/xml/components/`
  - `web/src/xml/layout/`
  - `web/src/xml/primitives/`
  - `web/src/xml/html/`
- `web/src/components/` and related UI primitives where shared UI logic is hosted.
- `web/tests/xml/` → web XML runtime and component rendering behavior:
  - `web/tests/xml/components/`
  - `web/tests/xml/layout/`
  - `web/tests/xml/primitives/`
  - `web/tests/xml/html/`

What to maintain:

- Tag-to-component mapping and rendering behavior.
- Attribute parsing, defaults, and error handling.
- Stateful/binding behavior (`State`, `Query`, `bind:*`) as interpreted by the runtime.
- Tests for new and changed behavior, including edge cases and failure modes.

### 3) API pages and usage examples

Primary areas:

- `api/src/pages/` → XML pages used by control-plane views.
- `sdk/sample/src/pages/` → SDK sample app pages.

What to maintain:

- Update pages that use changed tags/attributes.
- Add or adjust examples when introducing new XML capabilities.
- Remove outdated usage patterns when replacement flow is complete.

### 4) Documentation

Primary areas:

- `docs/` → public/internal explanation of XML usage.
- `sdk/CONTRIBUTING.md`, `web/CONTRIBUTING.md`, and root guidance when workflow expectations change.

What to maintain:

- XML component contract and usage examples.
- Migration notes when behavior changes.
- Any cross-repo maintenance checklist that contributors rely on.

## Required end-to-end workflow for XML component changes

For every XML feature/change, execute this flow in order:

1. **Define contract**
   - Update schema and expected semantics first (what the tag/attribute means).
2. **Implement SDK-side impacts**
   - Update SDK codepaths and sample fixtures that represent canonical usage.
3. **Implement web runtime/component behavior**
   - Add/update rendering and parsing logic in `web/src/xml/**`.
4. **Update tests in both layers**
   - SDK XML tests + web XML tests must reflect the new contract.
5. **Update real XML page usages**
   - Adjust `api/src/pages/*.xml` and/or sample pages when needed.
6. **Update docs**
   - Ensure docs explain usage and constraints clearly.
7. **Final quality pass**
   - Verify no stale examples, no orphan behavior, and no schema/runtime mismatch.

## Change checklist (must pass before considering XML work done)

- [ ] Schema and runtime behavior are consistent.
- [ ] SDK-side XML tests updated where behavior changed.
- [ ] Web-side XML tests updated where behavior changed.
- [ ] Existing XML pages continue to work or are intentionally migrated.
- [ ] Documentation reflects final behavior, not intermediate implementation.
- [ ] Obsolete XML flow removed if replacement is complete (MVP model preference).

## Guardrails for agents

- Do not treat only one folder as sufficient for XML work; XML is cross-cutting by design.
- If adding a component, check **all four surfaces**: schema, SDK, web runtime, docs.
- If fixing a bug, find the contract mismatch first (schema vs runtime vs page usage).
- Prefer explicit, minimal changes that preserve architecture boundaries:
  - Control-plane pages live in `api/src/pages/`.
  - SDK owns packaged schema and SDK-level behavior.
  - Web owns rendering/runtime behavior.
- Do not leave “placeholder” updates; provide concrete file-level updates or clearly call out missing required surfaces.

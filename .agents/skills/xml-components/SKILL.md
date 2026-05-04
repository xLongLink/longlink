---
name: xml-components
description: Explain LongLink XML component structure, testing, and documentation conventions
license: MIT
compatibility: opencode
metadata:
  audience: contributors
  workflow: docs
---

## What I do

- Explain how LongLink XML pages are composed from `Page`, `Query`, `Menu`, `Hero`, `Card`, `Table`, `Tabs`, and form components
- Describe how XML pages are organized into sections, subsections, layouts, and data-driven views
- Summarize the XML runtime testing approach and where XML behavior is exercised
- Point to the documentation and schema files that define the supported XML surface

## How components are structured

- XML pages start with the schema reference and a root `Page` element.
- Page content is built from composable blocks such as `Hero`, `Menu`, `Columns`, `Grid`, `Card`, `Tabs`, and `Table`.
- `MenuSection` and `MenuSubSection` define tabbed navigation and nested views.
- `State`, `Query`, and `bind:*` attributes connect UI pieces to runtime data and form state.
- Prefer small, explicit compositions that mirror the existing sample pages in `sdk/sample/src/pages/` and `api/src/pages/`.

## How they are tested

- XML behavior is covered through the XML runtime and component test area under `sdk/tests/xml/`.
- The sample pages in `sdk/sample/src/pages/` and `api/src/pages/` act as reference fixtures for supported patterns.
- When validating changes, check that the XML still matches the published schema and renders through the runtime without breaking page composition.

## How they are documented

- The schema reference is published at `https://docs.longlink.dev/schema.xsd`.
- Repository guidance lives in `sdk/CONTRIBUTING.md` and the root `CONTRIBUTING.md`.
- Use the sample XML pages as the clearest documentation for structure and supported components.

## When to use me

Use this when you need to understand, explain, or extend LongLink XML pages and their component model.

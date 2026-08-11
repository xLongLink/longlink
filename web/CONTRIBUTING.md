# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, XML runtime, docs, and Platform rendering path.

## Architecture

The combined repository architecture is maintained in `../AGENTS.md`.

React Router Framework Mode builds two browser applications from the shared package. `src/platform/` contains the Platform routes and prerendered public pages, while `src/application/` contains the SPA embedded in LongLink Applications. Builds publish directly to `../api/src/.static/web/` and `../sdk/longlink/.static/web/`.

## Routes

`src/platform/routes.ts` is the Platform route source of truth. Documentation metadata and prerendered paths live in `src/platform/docs/pages.ts`, while `src/platform/docs/catalog.tsx` adds content and navigation. Generate the React Router route tree instead of maintaining a duplicate list:

```bash
vp run routes
```

```bash
vp run dev         # Starts the Platform development server
vp run dev:sdk     # Starts the embedded Application development server
vp run routes      # Prints the generated Platform route tree
vp run build:api   # Builds the Platform web bundle
vp run build:sdk   # Builds the embedded Application web bundle
vp run check       # Checks formatting, linting, and Vite+ types
vp run typecheck   # Checks both React Router bundle modes
vp fmt --write     # Formats the code
```

## Guidelines

- Use Astryx components and providers for UI, overlays, links, and notifications.
- XML adapters import components directly from `@astryxdesign/core/<Component>`.

## Theme

```bash
theme                   # light | dark
background              # Page background color
primary                 # Default text color
accent                  # Accent color
muted                   # Muted content color
radius                  # none | small | medium | large
```

Theme values are defined in `src/lib/theme.ts` and applied programmatically to the document root. `src/lib/default-theme.ts` is the source of truth for the static first-paint theme. Astryx writes its ignored outputs to `src/lib/generated/`; do not edit or commit those files. Development, type-check, route, and build scripts regenerate them automatically, or run `vp run theme:build` explicitly.

## Primitives

```xml
<Avatar>, <Badge>, <Banner>, <Button>, <ButtonGroup>, <Card>, <CheckboxInput>, <Dialog>, <Divider>, <FileInput>, <FormLayout>, <Grid>, <Heading>, <Icon>, <Link>, <NumberInput>, <RadioList>, <RadioListItem>, <Selector>, <SelectorOption>, <Slider>, <Stack>, <Switch>, <Tab>, <TabList>, <Table>, <TableColumn>, <Text>, <TextArea>, <TextInput>
```

Runtime tags are `<longlink>`, `<State>`, `<Query>`, `<For>`, and `<Action>`.

## XML

- XML pages are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/registry.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.
- The localization boundary is the text-bearing component itself. Use dotted translation keys like `i18n="tasks.title"` on `Text`, `Heading`, `Button`, and similar tags. Keep `src/i18n/en.json` as a flat Astryx catalog where each key maps to an object with a required string `defaultMessage` and optional string `description`.
- Pass interpolation data through one object expression such as `values="${{ name: item.name }}"`; arbitrary interpolation attributes are not part of XML v2.
- Catalog interpolation uses ICU placeholders such as `{name}`. The XML expression syntax in `values="${{ name: item.name }}"` is separate and remains unchanged.
- Pluralized text uses one ICU message, for example `{ "items.count": { "defaultMessage": "{count, plural, =0 {No items} one {# item} other {# items}}" } }`.
- Nested catalogs, bare string entries, `{{name}}` placeholders, and plural-map entries are not supported.
- XML rejects `className`, `style`, `xstyle`, and event-handler attributes. Adapters own all visual styling and callbacks.

## Keep changes aligned

- Keep platform concerns in the API mode path.
- Use direct Astryx imports for reusable UI.
- Keep XML runtime and compiler changes inside `src/xml/`.
- Prefer `src/lib/api.ts` helpers over raw `fetch`.
- Remove obsolete flows when replacing them end to end.
- Favor the current MVP model over backward compatibility.

## Adding or Changing a Component

1. Add or edit the adapter in `web/src/xml/adapters/`.
2. Keep the adapter entry point small and documented.
3. Use `useXmlContext` for runtime scope, `renderNode` for child rendering, and `useUrl` for URL resolution.
4. Export the adapter from `web/src/xml/adapters/index.ts`.
5. Register the tag in `web/src/xml/core/registry.tsx`.
6. Update parser, context, or helper code only when the component needs new runtime behavior.
7. Add focused tests under `web/tests/xml/`.
8. Update docs/examples so the new XML shape is discoverable.

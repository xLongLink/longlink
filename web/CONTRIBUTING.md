# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, XML runtime, docs, and platform rendering path.

## Architecture

The combined repository architecture is maintained in `../AGENTS.md`.

## Pages

```bash
/
├── pages
│   └── docs
│       ├── api
│       │   └── self-hosted
│       ├── sdk
│       │   ├── building
│       │   ├── database
│       │   ├── environments
│       │   ├── pages
│       │   │   ├── components
│       │   │   └── layout
│       │   ├── routes
│       │   ├── storage
│       │   └── testing
├── impressum
├── pricing
├── terms
├── privacy
├── organizations
├── settings
├── admin
│   ├── users
│   ├── applications
│   ├── organizations
│   ├── database
│   ├── storage
│   ├── compute
│   │   ├── :compute
│   │   └── :compute/namespace/:namespace
│   └── operations
├── orgs/:organization
├── orgs/:organization/database
├── orgs/:organization/storage
├── orgs/:organization/settings
│   ├── applications
│   │   └── :settingsApplication
│   ├── people
│   ├── database
│   └── storage
└── orgs/:organization/apps/:application/*
```

```bash
bun run dev         # Starts the Vite dev server on localhost for live preview.
bun run build:api   # Builds the platform web bundle
bun run build:sdk   # Builds the SDK embedded web bundle
bun run format      # Format the code
```

Set `VITE_DEV_HOST=0.0.0.0` only when the local Vite server must be reachable from another device.

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

Theme values are defined in `src/lib/theme.ts` and applied programmatically to the document root.

## Primitives

```xml
<Avatar>, <Badge>, <Banner>, <Button>, <ButtonGroup>, <Card>, <CheckboxInput>, <Code>, <Dialog>, <Divider>, <FileInput>, <FormLayout>, <Grid>, <Heading>, <Icon>, <Link>, <NumberInput>, <RadioList>, <RadioListItem>, <Selector>, <SelectorOption>, <Slider>, <Stack>, <Switch>, <Tab>, <TabList>, <Table>, <TableColumn>, <Text>, <TextArea>, <TextInput>
```

Runtime tags are `<longlink>`, `<State>`, `<Query>`, `<For>`, and `<Action>`.

## XML

- XML pages are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/registry.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.
- The localization boundary is the text-bearing component itself. Use dotted translation keys like `i18n="tasks.title"` on `Text`, `Heading`, `Button`, and similar tags, then keep translation strings in the app catalog at `src/i18n/en.json`.
- Pass interpolation data through one object expression such as `values="${{ name: item.name }}"`; arbitrary interpolation attributes are not part of XML v2.
- Pluralized text uses `Intl.PluralRules` categories in the translation bundle, for example `{ "items": { "one": "1 item", "other": "{{count}} items" } }`.
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

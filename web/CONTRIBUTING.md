# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, XML runtime, docs, and control-plane rendering path.

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
│   ├── locations
│   ├── database
│   │   ├── :database
│   │   └── :database/databases/:databaseName
│   ├── storage
│   │   ├── :storage
│   │   └── :storage/buckets/:bucket
│   ├── compute
│   │   ├── :compute
│   │   └── :compute/namespace/:namespace
│   └── operations
├── orgs/:organization
├── orgs/:organization/applications
├── orgs/:organization/database
│   ├── :databaseResourceType/:databaseResource
│   └── :databaseResourceType/:databaseResource/tables/:databaseTable
├── orgs/:organization/storage
│   └── buckets/:bucket
├── orgs/:organization/settings
│   ├── applications
│   │   └── :settingsApplication
│   ├── people
│   ├── database
│   │   ├── :settingsDatabaseResourceType/:settingsDatabaseResource
│   │   └── :settingsDatabaseResourceType/:settingsDatabaseResource/tables/:settingsDatabaseTable
│   └── storage
│       └── :settingsBucket
└── orgs/:organization/apps/:application/*
```

```bash
bun run dev         # Starts the Vite dev server on localhost for live preview.
bun run build:api   # Builds the control-plane web bundle
bun run build:sdk   # Builds the SDK embedded web bundle
bun run format      # Format the code
```

Set `VITE_DEV_HOST=0.0.0.0` only when the local Vite server must be reachable from another device.

## Guidelines

- Use the `Toaster` for the user notifications

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
<A>, <Avatar>, <AvatarBadge>, <AvatarFallback>, <AvatarImage>, <B>, <Badge>, <Br>, <Button>, <ButtonGroup>, <ButtonGroupSeparator>, <ButtonGroupText>, <Card>, <Checkbox>, <Code>, <Column>, <Columns>, <DataCell>, <DataColumn>, <DataHeader>, <DataTable>, <Dialog>, <DialogContent>, <DialogDescription>, <DialogTitle>, <DialogTrigger>, <Field>, <FieldContent>, <FieldDescription>, <FieldLabel>, <FieldLegend>, <FieldTitle>, <Flex>, <Grid>, <H1>, <H2>, <H3>, <H4>, <Hero>, <HeroAction>, <HeroDescription>, <HeroTitle>, <Hr>, <Icon>, <Input>, <InputGroup>, <InputGroupAddon>, <InputGroupButton>, <InputGroupInput>, <InputGroupText>, <InputGroupTextarea>, <Label>, <Li>, <Menu>, <MenuSection>, <MenuSubSection>, <Ol>, <P>, <Pre>, <RadioGroup>, <RadioGroupItem>, <S>, <Select>, <SelectContent>, <SelectGroup>, <SelectItem>, <SelectLabel>, <SelectSeparator>, <SelectTrigger>, <SelectValue>, <Slider>, <Stack>, <Sub>, <Sup>, <Switch>, <Tab>, <Tabs>, <Textarea>, <Toggle>, <ToggleGroup>, <ToggleGroupItem>, <U>, <Ul>
```

## XML

- XML pages are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/node.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.
- The localization boundary is the text-bearing component itself. Use dotted translation keys like `i18n="tasks.title"` on `P`, `H1`, `Button`, and similar tags, then keep translation strings in the app catalog at `src/i18n/en.json`.
- Pluralized text uses `Intl.PluralRules` categories in the translation bundle, for example `{ "items": { "one": "1 item", "other": "{{count}} items" } }`.

## Keep changes aligned

- Keep control-plane concerns in the API mode path.
- Use shadcn/ui and the existing `src/components/ui/` primitives for reusable UI.
- Keep the current shadcn/ui primitive set and related dependencies unless a component is proven obsolete by a product decision.
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

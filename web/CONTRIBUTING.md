# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, XML runtime, docs, and Platform rendering path.

## Architecture

The combined repository architecture is maintained in `../AGENTS.md`.

React Router Framework Mode builds two browser applications from the shared package. `src/platform/` contains the Platform routes and prerendered public pages, while `src/solution/` contains the SPA embedded in LongLink Solutions. Builds publish directly to `../api/src/.static/web/` and `../sdk/longlink/.static/web/`.

## Routes

`src/platform/routes.ts` is the Platform route source of truth. Documentation content and navigation are co-located in `src/platform/routes/docs/`, while prerendered public paths live in `react-router.config.ts`. Generate the React Router route tree instead of maintaining a duplicate list:

```bash
vp run routes
```

```bash
vp run dev         # Starts the Platform development server
vp run dev:sdk     # Starts the embedded Solution development server
vp run routes      # Prints the generated Platform route tree
vp run build:api   # Builds the Platform web bundle
vp run build:sdk   # Builds the embedded Solution web bundle
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

Theme preferences are defined in `src/theme.ts` and applied through the root provider. `src/lib/generated/stone.css` is a committed generated artifact; do not edit it directly. Run `vp run theme` after changing `src/theme.ts`.

## Primitives

```xml
<Avatar>, <Badge>, <Banner>, <Button>, <ButtonGroup>, <Card>, <CheckboxInput>, <Dialog>, <Divider>, <FileInput>, <Grid>, <GridSpan>, <Heading>, <Icon>, <Link>, <NumberInput>, <Option>, <RadioList>, <Selector>, <Slider>, <Stack>, <StackItem>, <Switch>, <Tab>, <Tabs>, <Table>, <TableColumn>, <Text>, <TextArea>, <TextInput>
```

Runtime tags are `<longlink>`, `<State>`, `<Query>`, `<For>`, and `<Action>`.

## XML

- Solution Views are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/registry.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.
- Text-bearing components use Astryx `label`, `title`, or `value` attributes. Use expressions in `value` for dynamic copy.
- XML rejects `className`, `style`, `xstyle`, and event-handler attributes. Adapters own all visual styling and callbacks.

## Keep changes aligned

- Keep platform concerns in the API mode path.
- Use direct Astryx imports for reusable UI.
- Keep XML runtime and compiler changes inside `src/xml/`.
- Prefer `src/lib/api.ts` helpers over raw `fetch`.
- Remove obsolete flows when replacing them end to end.
- Favor the current MVP model over backward compatibility.

## Adding or Changing a Component

1. Add or edit the adapter in `src/xml/adapters/`.
2. Keep the adapter entry point small and documented.
3. Use `useXmlRuntime` for runtime scope and `renderNode` for child rendering.
4. Register the tag in `src/xml/core/registry.tsx`.
5. Update parser, context, or helper code only when the component needs new runtime behavior.
6. Add focused tests under `web/tests/xml/`.
7. Update docs/examples so the new XML shape is discoverable.

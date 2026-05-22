# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, XML runtime, and control-plane rendering path.

```bash
bun run dev         # Starts the Vite dev server for live preview.
bun run build:api   # Builds the control-plane web bundle
bun run build:sdk   # Builds the sdk web bundle (for development)
bun run format      # Format the code
```

## Code structure

```bash
web/
├── src/
│   ├── components/      # Shared app components
│   │   └── ui/          # UI primitives
│   ├── docs/            # Documentation layout and pages
│   │   ├── api/         # Control Plane relates
│   │   ├── sdk/         # Sdk related
│   │   └── xml/         # XML Pages related
│   ├── hooks/           # Shared React ooks 
│   ├── lib/             # Shared Utilities
│   ├── pages/           # Route-level pages
│   ├── xml/             # XML compiler, runtime, layouts, primitives, components
│   ├── App.tsx
│   ├── index.css        #
│   ├── Layout.tsx
│   └── main.tsx
├── tests/
├── index.html
├── vite.config.ts
└── package.json
```


## Theme

```bash
--background            # Page background color
--foreground            # Default text color
--card                  # Card surface color
--card-foreground       # Text color inside cards
--popover               # Popover surface color
--popover-foreground    # Text color inside popovers
--primary               # Primary brand color
--primary-foreground    # Text color on primary surfaces
--secondary             # Secondary surface color
--secondary-foreground  # Text color on secondary surfaces
--muted                 # Muted surface color
--muted-foreground      # Text color on muted surfaces
--accent                # Accent surface color
--accent-foreground     # Text color on accent surfaces
--destructive           # Destructive action color
--border                # Border color
--input                 # Input border color
--ring                  # Focus ring color
--radius                # Global corner radius
```

## Primitives

```xml
<A>
<Accordion>
<Alert>
<AlertDialog>
<AspectRatio>
<Avatar>
<B>
<Badge>
<Br>
<Breadcrumb>
<Button>
<ButtonGroup>
<Calendar>
<Card>
<Carousel>
<Chart>
<Checkbox>
<Code>
<Collapsible>
<Columns>
<Combobox>
<Command>
<ContextMenu>
<Dialog>
<Direction>
<Drawer>
<DropdownMenu>
<Empty>
<Field>
<Grid>
<Heading>
<Hero>
<HoverCard>
<Icon>
<Input>
<InputGroup>
<InputOtp>
<Item>
<Kbd>
<Label>
<Li>
<Menu>
<NativeSelect>
<NavigationMenu>
<Ol>
<P>
<Pagination>
<Popover>
<Progress>
<RadioGroup>
<Resizable>
<S>
<ScrollArea>
<Select>
<Separator>
<Sheet>
<Sidebar>
<Skeleton>
<Slider>
<Sonner>
<Spinner>
<Stack>
<Sub>
<Sup>
<Switch>
<Table>
<Tabs>
<Textarea>
<Toggle>
<ToggleGroup>
<Tooltip>
<U>
<Ul>
```


## XML

- XML pages are parsed by `src/xml/core/parser.ts` into an AST.
- The renderer in `src/xml/renderers.tsx` seeds runtime state and renders the AST through `src/xml/core/node.tsx`.
- Component names must exist in `src/xml/core/node.tsx`; unknown tags fail at render time.
- Child content is rendered recursively, so nested XML components stay under the same runtime context.

## Keep changes aligned

- Keep control-plane concerns in the API mode path.
- Use shadcn/ui and the existing `src/ui/` primitives for reusable UI.
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
8. Update SDK XSD assets when the schema changes.
9. Update docs/examples so the new XML shape is discoverable.

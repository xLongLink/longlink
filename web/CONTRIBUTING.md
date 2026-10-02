# Contributing

The web folder contains the frontend runtime for LongLink. It owns the shared UI, View runtime, docs, and Platform rendering path.

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
- View adapters import components directly from `@astryxdesign/core/<Component>`.

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

Solution Views use native JSX components from `src/views/components.ts`. React,
`request`, `navigate`, `params`, `useQuery`, and `useQueryClient` are provided by
the sandbox runtime. State uses React hooks; inputs use controlled callbacks;
queries and ordered actions are ordinary JavaScript rather than XML tags.

## Views

- A Solution View is a `.jsx` file exporting one default React component, without package imports. Python discovers and serves source without compiling or executing JavaScript.
- Optional adjacent `.json` files define `name` and `icon`. Routes still derive from filenames, including `[parameter]` segments.
- Sucrase compiles source only inside `src/views/runtime.tsx`. The host must never import, compile, or evaluate Solution source.
- `JsxView` uses an opaque-origin iframe with only `allow-scripts`; never add `allow-same-origin`, top navigation, popups, forms, or downloads.
- CSP permits only the hashed bootstrap, isolated evaluation, native inline styles, and data/blob images. Direct fetch, workers, external assets, and nested document frames are blocked.
- A fresh WindowProxy/session handshake transfers a private MessagePort. Only validated Solution-relative API and navigation operations cross it. Requests cannot choose credentials, headers, redirects, or arbitrary URLs.
- Host requests retain backend authorization, have byte/concurrency/time limits, and are aborted when the View unmounts. Every value returned to the frame is visible to the untrusted Solution author; never send Platform secrets.
- Isolation is not a CPU/memory sandbox or a guarantee against exfiltration of data intentionally shared with the View. Browser sandbox/CSP behavior needs manual verification before a production rollout.
- If deployment CSP inherited by `srcdoc` blocks the bootstrap or evaluation, use a separate-origin renderer document rather than weakening the Platform policy.
- VS Code supports JSX natively. Generated Solutions include JavaScript project configuration and editor declarations, not a custom extension.
- Run `vp run build:views` to generate `public/views/runtime.js` and `runtime.css`; application builds include these static files. Solutions do not run this build themselves.
- Bundled Platform pages currently retain the trusted internal XML runtime under `src/xml/`. That path must never receive Solution-provided source.

## Keep changes aligned

- Keep platform concerns in the API mode path.
- Use direct Astryx imports for reusable UI.
- Keep Solution runtime and compiler changes inside `src/views/` and the host bridge.
- Prefer `src/lib/api.ts` helpers over raw `fetch`.
- Remove obsolete flows when replacing them end to end.
- Favor the current MVP model over backward compatibility.

## Adding or Changing a Component

1. Export native components from `src/views/components.ts`; add wrappers only for meaningful LongLink behavior.
2. Keep privileged operations in the host bridge, never inside a UI component.
3. Update `sdk/longlink/.static/new/src/views/frontend.d.ts` for editor/CLI documentation.
4. Update the sample JSX Views and relevant existing tests.

---
name: web
description: Guide to web folder structure and design guideliness
---

The web package is the frontend runtime for LongLink. It owns the shared UI, page shells, SDK-specific layout wiring, and the XML runtime used by the platform.

## Structure

```text
longlink/
├── web/
│   ├── CONTRIBUTING.md       # Local web-layer contribution rules
│   ├── README.md             # Frontend setup and entrypoints
│   ├── src/
│   │   ├── App.tsx            # Main app composition
│   │   ├── Layout.tsx         # Shared app shell
│   │   ├── main.tsx          # Vite entrypoint
│   │   ├── components/       # Shared application components
│   │   ├── hooks/            # Shared React hooks
│   │   ├── lib/              # Shared utilities and API helpers
│   │   ├── pages/            # Route-level pages
│   │   ├── sdk/              # SDK-specific shell and page wiring
│   │   ├── ui/               # shadcn/ui and shared primitives
│   │   └── xml/              # XML compiler, runtime, registry, and components
│   ├── tests/                # Web runtime and XML tests
│   ├── public/               # Static assets
│   └── vite.config.ts        # Vite configuration
├── api/
├── sdk/
└── docs/
```

## View

- Manage the fetching and rendering of metadata-driven views in the web runtime. 
- For the user

```jsx
<View metadata="/path/to/metadata.json" baseurl={baseurl} />
// User 
<View metadata="/api/user/metadata.json" baseurl="/api" />
// Organization
<View metadata="/api/{org}/metadata.json" baseurl="/api" />
// Application
<View metadata="/api/{org}/{app}/metadata.json" baseurl="/api/apps/{app_id}" />
```



## Formatting

Before PR:

```bash
bun run format
```

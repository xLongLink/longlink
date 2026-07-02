# LongLink Supported Features

This file tracks the behavior currently supported by the codebase. Keep it updated when features are added, removed, renamed, or materially changed.

## Maintenance

| Rule | Meaning |
| --- | --- |
| List implemented behavior only. | Exclude roadmap, partial, legacy, or UI-only behavior from this file. |
| Keep one feature per row. | Avoid bundling unrelated behavior into a single entry. |
| Describe behavior, not implementation. | The list should explain what the platform supports, not where the code lives. |
| Update with code changes. | Add, remove, or revise rows when supported behavior changes. |

## Product Surfaces

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Hosted platform API | Manages authentication, users, organizations, infrastructure registries, application deployment, operations, logs, and app proxying. |
| [ ] | Python SDK | Provides a FastAPI app runtime, CLI, database helpers, storage helpers, XML page discovery, metadata, scaffolding, and image packaging. |
| [ ] | API-mode frontend | Serves public pages, docs, authenticated control-plane pages, organization pages, admin pages, and proxied app views. |
| [ ] | SDK-mode frontend | Serves a local embedded app runtime that renders XML pages from `/metadata.json` with deterministic local users. |
| [ ] | Declarative XML app model | Supports XML-defined pages with setup state, data queries, actions, expressions, translations, form bindings, and registered UI components. |
| [ ] | Local-first workflow | Supports local services, SDK app scaffolding, image build/push, migrations, seeding, local API server, and local Vite web server. |

## Control Plane

### Runtime

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | API application bootstrap | Creates the FastAPI app, includes control-plane routers, disables Swagger UI, exposes ReDoc/OpenAPI, mounts the web bundle when available, and starts the operation scheduler. |
| [ ] | Built web serving | Serves the API-mode web bundle from `api/src/.static/web` when that directory exists. |
| [ ] | Browser sessions | Uses the `longlink_session` cookie and session-backed active account state. |
| [ ] | CORS policy | Allows credentialed CORS for configured origins, with localhost defaults in development. |
| [ ] | Health endpoint | `GET /api/healthz` returns `{"status":"ok"}`. |
| [ ] | Domain error responses | Maps domain errors to JSON `detail` responses with appropriate HTTP status codes. |
| [ ] | Control database sessions | Provides cached async SQLAlchemy sessions, connection verification, and database URL normalization. |
| [ ] | Control database migrations | Migrates users, organizations, applications, registries, memberships, invitations, and operations. |
| [ ] | Local seed script | Seeds local location, registries, organization, app metadata, and runtime data through public API routes. |
| [ ] | Local runtime endpoints | Separates host-facing endpoints from pod-facing runtime endpoints for PostgreSQL and S3-compatible storage. |

### Authentication and Access

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | OIDC login redirect | Starts OIDC login, supports Keycloak provider hints for `github` and `google`, and stores safe same-origin `next` paths. |
| [ ] | OIDC callback user sync | Exchanges the authorization code, validates userinfo, upserts the user, syncs organization shared users, activates the account, and redirects. |
| [ ] | Password login | Logs in through the OIDC provider password grant, fetches userinfo, upserts the user, activates the account, and returns 204. |
| [ ] | Saved session accounts | Lists saved accounts, activates a saved account, and deactivates the active account. |
| [ ] | Logout | Removes the active account from the session and returns `{ok:true}`. |
| [ ] | Current user profile | Returns identity, platform role, preferences, and organization memberships. |
| [ ] | Profile preferences update | Updates mutable profile fields and preferences, then resyncs organization database users. |
| [ ] | User listing | Allows support and administrator users to list all platform users. |
| [ ] | Role model | Supports platform roles, organization roles, and application roles. |
| [ ] | Membership privacy | Returns not-found style failures for organization non-members instead of disclosing membership state. |
| [ ] | First user bootstrap | Makes the first upserted user a platform administrator unless a role is explicitly supplied. |

### Infrastructure Registries

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Locations | Lists and gets locations for support/admin users; administrators can create and delete unused locations. |
| [ ] | Location providers | Supports `local`, `infomaniak`, `ovh`, `scaleway`, `hetzner`, and `exoscale`. |
| [ ] | Compute registries | Creates Kubernetes compute registries with kubeconfig and ingress host; lists, gets, and deletes unused registries for support/admin users. |
| [ ] | Compute inspection | Inspects cluster resources, managed namespaces, pods, and pod usage when metrics are available. |
| [ ] | Database registries | Creates PostgreSQL registries with control-plane and optional runtime connection details; lists, gets, and deletes unused registries for support/admin users. |
| [ ] | Database inspection | Inspects backend databases, schemas, and aggregate non-system database storage usage. |
| [ ] | Storage registries | Creates S3-compatible storage registries with control-plane and optional runtime endpoints; administrators can delete unused registries. |
| [ ] | Storage secret redaction | Exposes storage access key IDs without exposing secret access keys. |
| [ ] | Storage inspection | Inspects buckets and up to 1000 object metadata rows per bucket. |

### Organizations

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Organization creation | Lets authenticated users create organizations and become owner. |
| [ ] | Organization deletion | Lets owners and platform administrators soft-delete organizations and queue immediate runtime resource removal with delay-ready scheduling. |
| [ ] | Organization infrastructure bootstrap | Best-effort initializes compute namespace, organization database, shared users table, and shared storage bucket. |
| [ ] | Organization details | Lets members fetch an organization with location, users, pending invitations, and applications. |
| [ ] | Organization listing | Lets support/admin users list all organizations. |
| [ ] | Organization applications | Lets members list active applications in an organization, including caller application role when present. |
| [ ] | Organization invitations | Lets maintainers/admins/owners create pending email invitations while rejecting duplicates and existing members. |
| [ ] | Member role update | Lets organization admins/owners update active member roles and resync shared users. |
| [ ] | Organization database resources | Shows expected shared/app database resources with availability status and usage metrics. |
| [ ] | Organization table preview | Previews columns and up to 100 rows for shared users or app schema tables; system schemas are blocked. |
| [ ] | Organization storage resources | Shows expected shared/app buckets with availability status. |

### Applications

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Image metadata inspection | Reads LongLink OCI image labels for app metadata and environment requirements. |
| [ ] | Image registry safety | Rejects private/local/non-public image registries unless development mode explicitly allows the configured local registry. |
| [ ] | Icon catalog | Returns supported Lucide icon slugs and validates normalized app icons. |
| [ ] | Application creation and deployment | Creates apps from images, selects location registries, provisions resources, and queues verification. |
| [ ] | Application deletion | Lets permitted users soft-delete applications and queue immediate runtime resource removal with delay-ready scheduling. |
| [ ] | Required application envs | Requires image-declared envs unless they are platform-managed. |
| [ ] | Platform env injection | Strips user-supplied `LONGLINK_` envs and injects production database/storage runtime values. |
| [ ] | Application status model | Supports `creating`, `running`, and `failed`. |
| [ ] | Application verification | Marks apps running when rollout pods are ready and failed when current rollout pods crash. |
| [ ] | Global application listing | Lets platform administrators list all active applications. |
| [ ] | Application logs | Lets application maintainers/admins and elevated organization members fetch recent plain-text logs from the newest application pod. |
| [ ] | Application proxy | Proxies `GET`, `POST`, `PATCH`, and `DELETE` non-root paths into running application services for users with application access. |
| [ ] | Application access roles | Uses application membership roles for runtime access, with elevated organization roles allowed to manage application lifecycle actions. |
| [ ] | Proxy header policy | Strips unsafe request/response headers, injects `x-user-id`, and returns no-store 503 for unavailable apps. |
| [ ] | Registry selection | Uses the newest active compute/storage registry for the organization location and stores runtime registry references. |
| [ ] | Managed resource naming | Validates slugs and managed Kubernetes/PostgreSQL/S3 resource names before provisioning. |

### Operations and Adapters

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Operation records | Stores operation kind, step, app/org references, scheduled time, timestamps, errors, lease metadata, and derived status. |
| [ ] | Operation listing | Lets support/admin users list operations newest first. |
| [ ] | Background operation scheduler | Claims scheduled/expired operations, runs handlers, renews leases, and keeps polling without blocking requests. |
| [ ] | Operation leases | Requires matching lease tokens for claim, complete, fail, defer, and renew operations. |
| [ ] | Application create verification operation | Supports `application.create` step `verify` for checking rollout health. |
| [ ] | Application delete cleanup operation | Supports `application.delete` step `remove` for deleting managed app runtime resources. |
| [ ] | Organization delete cleanup operation | Supports `organization.delete` step `remove` for deleting managed organization runtime resources. |
| [ ] | Kubernetes provisioning | Creates managed namespaces plus one Secret, Deployment, and ClusterIP Service per app. |
| [ ] | Kubernetes service proxy | Proxies requests through the Kubernetes service proxy API. |
| [ ] | PostgreSQL provisioning | Creates organization databases, shared users table, app schemas, runtime login roles, and grants. |
| [ ] | PostgreSQL resource inspection | Inspects databases, schemas, usage, tables, and preview rows. |
| [ ] | S3-compatible provisioning | Creates or reuses shared and app buckets from managed slugs. |
| [ ] | S3-compatible resource inspection | Lists buckets and object metadata for storage browsers. |
| [ ] | Invitation email utility | Provides MJML/SMTP invitation email helpers when email settings are complete. |

## Python SDK

### Runtime

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | SDK exports | Exports app, router, user, XML, env, database, app/shared storage, and import-time runtime objects. |
| [ ] | SDK environment model | Reads `LONGLINK_` runtime mode, database, and storage settings from process env. |
| [ ] | App env file loading | Loads app-defined `.env` and `.env.sample` settings while ignoring extra keys. |
| [ ] | SDK package data | Packages static web and XSD assets and requires Python 3.14 or newer. |
| [ ] | LongLink FastAPI app | Includes SDK routes, audit middleware, optional i18n/pages, frontend assets, and development CORS. |
| [ ] | SDK i18n route | Mounts `src/i18n` under `/i18n` when translation files exist. |
| [ ] | SDK XML page discovery | Validates XML files in `src/pages` against XSD and registers them as GET routes under `/pages/...xml`. |
| [ ] | SDK frontend entrypoint | Serves the bundled SDK web app at `/` and mounts `/assets` when available. |
| [ ] | SDK development CORS | Allows localhost origins `3000`, `5173`, and `8000` in development mode. |
| [ ] | SDK router compatibility | Provides a thin FastAPI `APIRouter` wrapper. |
| [ ] | SDK dev log filter | Hides noisy frontend GET logs while keeping mutating, `/api/`, and `/auth/` logs. |
| [ ] | App metadata loading | Loads metadata from `[tool.longlink]`, then PEP 621 `[project]`, with defaults. |
| [ ] | Runtime metadata endpoint | Returns app name, title, summary, description, version, and discovered pages. |
| [ ] | Page navigation metadata | Provides page tab, path, and optional name/icon parsed from XML root metadata. |

### CLI and Packaging

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | CLI command group | Exposes `build`, `dev`, `docs`, `init`, `migrate`, `test`, and `translations`. |
| [ ] | App scaffold creation | Creates a new app scaffold and rejects non-empty targets. |
| [ ] | Scaffold GitHub CI | Adds GitHub Actions test and release workflows; GitHub is the only supported CI provider. |
| [ ] | Local dev server | Runs `main:app` with uvicorn reload on `0.0.0.0:1707` and interactive shortcuts when available. |
| [ ] | App test command | Runs application tests with pytest and forwards pytest arguments. |
| [ ] | App migration command | Applies pending migrations, autogenerates a revision if schema changes exist, then reapplies. |
| [ ] | Docker image build | Builds a Docker image in a temporary context, optionally tags, pushes, and reports image details. |
| [ ] | Generated Docker runtime | Runs app migrations before starting `uvicorn main:app` on port 80. |
| [ ] | Image metadata labels | Writes LongLink app metadata and environment metadata into image labels. |
| [ ] | Environment metadata labels | Reads annotated `src/envs.py` fields and emits typed required/optional environment definitions. |
| [ ] | Build context filtering | Excludes local secrets, local databases, caches, generated directories, and `node_modules`. |
| [ ] | XML component docs CLI | Renders component docs from XSD. |
| [ ] | Translation catalog generation | Scans XML `i18n` keys, preserves existing/plural translations, rejects collisions, and writes catalogs. |

### Database, Audit, and Storage

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Database facade | Exposes `Table` and async `get_session()`. |
| [ ] | Table base model | Adds UUID primary keys, audit timestamps, soft-delete fields, user foreign keys, and user relationships. |
| [ ] | Database environment URLs | Uses in-memory SQLite for testing, `./dev.db` for development, and normalized `DATABASE_URL` for production. |
| [ ] | Database URL normalization | Converts PostgreSQL URLs to asyncpg, strips `sslmode`, and preserves unrelated query parameters. |
| [ ] | SQLite autocreate and seed | Auto-creates SQLModel tables and seeds deterministic local users for SQLite. |
| [ ] | Local user roles | Provides deterministic local/test users for `read`, `write`, `maintain`, `admin`, and `owner`. |
| [ ] | Audit header scope | Reads `x-user-id` as UUID and binds it for request audit attribution. |
| [ ] | Audit auto fields | Fills create/update audit fields and converts hard deletes on SDK tables into soft deletes. |
| [ ] | App Alembic migrations | Discovers app models, excludes shared `users`, skips empty revisions, and applies app migrations. |
| [ ] | Production schema search path | Uses app schema plus `public` when `DATABASE_SCHEMA` is set. |
| [ ] | SDK auth boundary | Provides local users and audit attribution, but no login or permission system. |
| [ ] | Environment storage backends | Uses fsspec memory FS for testing, local file FS for development, and parsed `STORAGE_URL` for production. |
| [ ] | S3 endpoint URL parsing | Creates an S3 filesystem from `s3+http://key:secret@endpoint` style URLs. |
| [ ] | App bucket scope | Scopes app paths to `STORAGE_BUCKET` with `DirFileSystem`. |
| [ ] | Shared bucket scope | Exposes `shared_fs` and `create_shared_fs()` scoped to `STORAGE_SHARED_BUCKET` when configured. |

### XML Utilities and Scaffold

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | XML element validation | Validates XML from file or memory against XSD with unsafe XML parser features disabled. |
| [ ] | XML metadata parse | Parses `<longlink>` XML metadata for page metadata extraction. |
| [ ] | XML schema root | Defines the XSD entrypoint for root/app, state/query/loop/action, text, layout, input, table, tabs, and menu adapters. |
| [ ] | Schema-backed component docs | Uses XSD adapter files to generate XML component docs. |
| [ ] | Scaffold app entrypoint | New apps include `main.py` with LongLink app setup and demo routers. |
| [ ] | Scaffold env sample | New apps include required and optional environment examples. |
| [ ] | Scaffold inventory API | Demo inventory feature includes table, schemas, service, list route, and create route. |
| [ ] | Scaffold file API | Demo documents feature lists, uploads, downloads, and deletes files through SDK storage. |
| [ ] | Scaffold submission API | Demo form/order endpoints echo submitted payloads. |
| [ ] | Scaffold XML showcase | New apps include XML pages for inventory, documents, forms, cart, quote, menu, and localized text. |
| [ ] | Scaffold initial migration | New apps include an initial inventory Alembic migration. |
| [ ] | Scaffold testing mode | New app tests use `LONGLINK_ENV=testing`, in-memory database settings, and a smoke test. |

## Web Frontend

### Build Modes and Routing

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | API web build mode | Builds the public/docs/control-plane bundle into `api/src/.static/web`. |
| [ ] | SDK web build mode | Builds the embedded SDK runtime bundle into `sdk/longlink/.static/web`. |
| [ ] | API URL resolution | Supports `VITE_API_URL` API prefixing and credentialed requests. |
| [ ] | SDK user header | Adds `x-user-id` from local storage in SDK mode unless already supplied. |
| [ ] | Lucide icon assets | Serves and emits `/lucide-icons/*.svg` for icon loading by slug. |
| [ ] | API route tree | Exposes public, docs, legal, organization, settings, admin, resource, and proxied app routes. |
| [ ] | SDK wildcard route | Routes every SDK-mode path to the SDK application view. |
| [ ] | Auth guard | Shows sign-in for anonymous users, enforces platform role hierarchy, and renders 404 for insufficient access. |
| [ ] | Organization app view | Resolves org/app slugs, enforces app access roles, fetches proxied metadata, renders XML pages, and exposes logs to permitted users. |
| [ ] | Top layout shell | Provides shared header, brand, breadcrumbs, and active tabs. |
| [ ] | XML app layout shell | Provides app tab navigation, tab icons, SDK docs link, and SDK user selector. |
| [ ] | Docs layout | Provides docs sidebar, breadcrumbs, table of contents, active scroll tracking, metadata, and edit links. |
| [ ] | Legal layout | Provides shared public legal page layout. |
| [ ] | Not found page | Renders a shared 404 with current path and navigation links. |

### Pages and Workspaces

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Public home page | Renders the marketing landing page with navbar, hero CTA, and feature cards. |
| [ ] | Pricing page | Exposes `/pricing` with Starter, Team, and Platform pricing options. |
| [ ] | Legal pages | Exposes impressum, privacy, and terms pages with minimal legal content. |
| [ ] | Documentation catalog | Exposes docs pages for API, self-hosting, SDK, environments, routes, storage, database, testing, building, XML pages, layout, and components. |
| [ ] | XML docs reference | Documents XML state, query, loops, conditions, i18n, expressions, invalidation, layout tags, and component tags. |
| [ ] | Docs heading anchors | Auto-slugs headings and renders hover anchor links. |
| [ ] | Organizations page | Shows sign-in for anonymous users; authenticated users list memberships and create organizations. |
| [ ] | User settings page | Lets users edit name/email, theme/accent/radius preferences, list organizations, and create organizations. |
| [ ] | Organization shell | Resolves organization slug and renders applications, people, database, storage, and settings sections. |
| [ ] | Organization applications UI | Lists organization applications and links to proxied app views. |
| [ ] | Organization people UI | Shows members/invitations, supports invitations, and supports member role changes for allowed roles. |
| [ ] | Organization settings UI | Shows organization details, permission role docs, apps, resources, logs, and app creation. |
| [ ] | Organization database browser | Lists database resources, browses schemas/shared tables, and previews table rows. |
| [ ] | Organization storage browser | Lists storage resources and bucket details. |
| [ ] | Admin shell | Provides support/admin tabs for users, apps, organizations, locations, database, storage, compute, and operations. |
| [ ] | Admin users UI | Lists users, roles, emails, OIDC subjects, and copy actions. |
| [ ] | Admin applications UI | Lists all applications with organization, status, image, and location context. |
| [ ] | Admin organizations UI | Lists organizations and lifecycle users. |
| [ ] | Admin locations UI | Lists locations and supports administrator-only location creation. |
| [ ] | Admin database UI | Manages database registries and browses usage, databases, and schemas. |
| [ ] | Admin storage UI | Manages storage registries and browses buckets and object metadata. |
| [ ] | Admin compute UI | Manages compute registries and browses resources, namespaces, pods, and pod usage. |
| [ ] | Admin operations UI | Lists scheduled, active, completed, and failed operations with timestamps, step, resource ids, and errors. |

### Clients, Hooks, and Components

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Fetch helpers | Normalize JSON/text/void fetches, headers, credentials, SDK user headers, URL prefixing, and API errors. |
| [ ] | Query hooks | Wrap React Query with collection fallbacks, 401 session clearing, 404 handling, and query keys. |
| [ ] | Auth hooks | Support current user fetching, password login, OIDC redirects, saved accounts, logout, profile menu, and theme application. |
| [ ] | Login redirect sanitization | Normalizes login redirects to same-origin relative paths and rejects external or malformed values. |
| [ ] | SDK user hooks | Provides deterministic SDK users for `read`, `write`, `maintain`, `admin`, and `owner`. |
| [ ] | Resource hooks | Provides typed hooks for users, orgs, apps, locations, databases, storages, computes, operations, metadata, and mobile breakpoint detection. |
| [ ] | Organization mutation helpers | Supports create organization, invite member, change member role, and create application flows. |
| [ ] | Create application dialog | Supports image inspection, metadata review, icon selection, env entry, and app creation. |
| [ ] | Registry connection dialogs | Create database, storage, and compute registries with location selection. |
| [ ] | Create location dialog | Supports administrator-only location creation. |
| [ ] | Create organization dialog | Supports organization creation with name, avatar URL, and location. |
| [ ] | Logs dialog | Fetches application logs only while open and displays logs/errors. |
| [ ] | Delete confirmation dialog | Provides reusable destructive confirmation UI for supported destructive resource actions. |
| [ ] | Data table component | Wraps TanStack Table with loading, empty, error, and column class support. |
| [ ] | Code block component | Renders syntax-highlighted code blocks with clipboard copy toast. |
| [ ] | UI primitive catalog | Provides shared UI primitives for React pages and the XML adapter subset. |
| [ ] | UI primitive files | Includes primitives such as buttons, dialogs, fields, forms, tables, menus, navigation, overlays, layout, typography, feedback, and data display components. |

## XML Runtime

### Core

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | XML parser | Parses XML into AST, preserves attributes, removes whitespace, ignores declarations/comments, and rejects visible literal text or malformed XML. |
| [ ] | XML component registry | Maps supported XML tag names explicitly to React adapters. |
| [ ] | XML renderer | Initializes setup state/query nodes, loads translations, subscribes to Valtio state, scopes errors, and renders AST nodes. |
| [ ] | XML execution context | Provides runtime scope, setup registration, query invalidation, locale, translations, and state preservation. |
| [ ] | XML URL sandbox | Allows safe links and requires Query/Action request URLs to be app-relative. |
| [ ] | XML translations | Resolves dotted keys, plural objects, `count`, and `{{placeholder}}` interpolation. |
| [ ] | XML expressions | Supports refs, dotted paths, typed expressions, interpolation, literals, identifiers, member access, arithmetic, `in`, arrays, objects, and templates while blocking unsafe properties. |
| [ ] | XML form bindings | Binds form controls to reactive state and handles number/file input normalization. |

### Setup, Actions, and Data

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | XML root/setup tags | `longlink`, `State`, `Query`, and `For` provide metadata, local state, JSON setup fetches, and scoped iteration. |
| [ ] | XML actions | Sends app-relative `GET`, `POST`, `PATCH`, or `DELETE` requests with JSON or multipart form payloads and invalidates queries. |
| [ ] | XML queries | Fetches JSON from app-relative paths during setup and exposes results under a query id. |
| [ ] | XML state | Initializes local reactive state from literal `State` attributes. |
| [ ] | XML loop rendering | Iterates array-like expression results and exposes each item under a local alias. |

### Components

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Text components | Supports headings, paragraphs, links, inline text styles, code/pre, lists, breaks, and separators. |
| [ ] | Layout components | Supports columns, grids, stacks, flex rows, cards, hero slots, tabs, dialogs, and menus. |
| [ ] | Form components | Supports buttons, fields, labels, inputs, textareas, input groups, checkboxes, switches, sliders, toggles, radio groups, and selects. |
| [ ] | Visual components | Supports Lucide icons, badges, avatars, avatar images/fallbacks, and avatar badges. |
| [ ] | Table components | Supports semantic tables and query-backed data tables with headers, cells, row scope, and empty messages. |
| [ ] | Registered render tags | Includes the currently registered XML render tags for text, layout, forms, tables, dialogs, menus, badges, avatars, and icons. |
| [ ] | Special setup tags | Handles `State`, `Query`, and `For` outside the render registry. |

## Local Development and Testing

| Checked | Feature | Supported behavior |
| --- | --- | --- |
| [ ] | Workspace install targets | Installs API, SDK, and web dependencies through workspace-specific targets. |
| [ ] | Workspace format targets | Runs API import sorting, SDK import sorting, and web/repository Prettier formatting. |
| [ ] | Workspace test targets | Runs API pytest, SDK pytest, web tests, web typecheck, and both web bundle builds. |
| [ ] | Web build targets | Typechecks and builds API and SDK web bundles. |
| [ ] | Local service dependencies | Provides PostgreSQL, MinIO, local OCI registry, and Keycloak through Docker Compose. |
| [ ] | Local compute cluster | Creates or reuses a k3d `compute` cluster, writes kubeconfig, and waits for service readiness. |
| [ ] | Local seed workflow | Starts services, scaffolds a dev SDK app if needed, builds/pushes its image, runs migrations, and seeds the API. |
| [ ] | Clean targets | Removes generated test/build artifacts, static web bundles, caches, and local SDK images. |
| [ ] | Pyright targets | Runs API and SDK type checks. |
| [ ] | Web test workflow | Runs Bun tests, TypeScript build mode, and both Vite bundle builds. |
| [ ] | SDK test coverage areas | Covers storage, database/migrations, router behavior, page/i18n routes, logging, CLI commands, and XML schemas. |
| [ ] | API test coverage areas | Covers routes, adapters, operations, database services, image inspection, auth, locations, registries, apps, icons, and mail helpers. |
| [ ] | Web test coverage areas | Covers API helpers, auth roles, XML layout, docs anchors, XML parser/context/rendering/query/actions/adapters/expressions, and URL safety. |

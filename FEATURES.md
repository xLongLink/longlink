# LongLink Supported Features

This file tracks the behavior currently supported by the codebase. Keep it updated when features are added, removed, renamed, or materially changed.

## Maintenance

| Rule                                   | Meaning                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| List implemented behavior only.        | Exclude roadmap, partial, legacy, or UI-only behavior from this file.         |
| Keep one feature per row.              | Avoid bundling unrelated behavior into a single entry.                        |
| Describe behavior, not implementation. | The list should explain what the platform supports, not where the code lives. |
| Update with code changes.              | Add, remove, or revise rows when supported behavior changes.                  |

## Product Surfaces

| Checked | Feature                   | Supported behavior                                                                                                                          |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Hosted platform API       | Manages authentication, users, organizations, infrastructure registries, application deployment, operations, logs, and app proxying.        |
| [x]     | Python SDK                | Provides a FastAPI app runtime, CLI, database helpers, storage helpers, XML page discovery, metadata, scaffolding, and image packaging.     |
| [x]     | API-mode frontend         | Serves public pages, docs, authenticated control-plane pages, organization pages, admin pages, and proxied app views.                       |
| [x]     | SDK-mode frontend         | Serves a local embedded app runtime that renders XML pages from `/metadata.json` with deterministic local users.                            |
| [x]     | Declarative XML app model | Supports XML-defined pages with setup state, data queries, actions, expressions, translations, form bindings, and registered UI components. |
| [x]     | Local-first workflow      | Supports local services, SDK app scaffolding, image build/push, migrations, seeding, local API server, and local Vite web server.           |

## Control Plane

### Runtime

| Checked | Feature                     | Supported behavior                                                                                                                                                             |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [x]     | API application bootstrap   | Creates the FastAPI app, includes control-plane routers, disables Swagger UI, exposes ReDoc/OpenAPI, mounts the web bundle when available, and starts the operation scheduler. |
| [x]     | Built web serving           | Serves the API-mode web bundle from `api/src/.static/web` when that directory exists.                                                                                          |
| [x]     | Browser sessions            | Uses the `longlink_session` cookie and session-backed active account state.                                                                                                    |
| [x]     | CORS policy                 | Allows credentialed CORS for configured origins, with localhost defaults in development.                                                                                       |
| [x]     | Health endpoint             | `GET /api/healthz` returns `{"status":"ok"}`.                                                                                                                                  |
| [x]     | Domain error responses      | Maps domain errors to JSON `detail` responses with appropriate HTTP status codes.                                                                                              |
| [x]     | Control database sessions   | Provides cached async SQLAlchemy sessions, connection verification, and database URL normalization.                                                                            |
| [x]     | Control database migrations | Migrates users, organizations, applications, registries, memberships, invitations, and operations, and applies pending migrations on local SQLite development starts.          |
| [x]     | Local seed script           | Seeds local location, registries, organization, app metadata, and runtime data through public API routes.                                                                      |
| [x]     | Local runtime endpoints     | Separates host-facing endpoints from pod-facing runtime endpoints for PostgreSQL and S3-compatible storage.                                                                    |

### Authentication and Access

| Checked | Feature                    | Supported behavior                                                                                                                             |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | OIDC login redirect        | Starts OIDC login, supports Keycloak provider hints for `github` and `google`, and stores safe same-origin `next` paths.                       |
| [x]     | OIDC callback user sync    | Exchanges the authorization code, validates userinfo, upserts the user, syncs organization shared users, activates the account, and redirects. |
| [x]     | Password login             | Logs in through the OIDC provider password grant, fetches userinfo, upserts the user, activates the account, and returns 204.                  |
| [x]     | Saved session accounts     | Lists saved accounts, activates a saved account, and deactivates the active account.                                                           |
| [x]     | Logout                     | Removes the active account from the session and returns `{ok:true}`.                                                                           |
| [x]     | Current user profile       | Returns identity, platform role, preferences, and organization memberships.                                                                    |
| [x]     | Profile preferences update | Updates mutable profile fields and preferences, then resyncs organization database users.                                                      |
| [x]     | User listing               | Allows support and administrator users to list all platform users.                                                                             |
| [x]     | Role model                 | Supports platform roles, organization roles, and application roles.                                                                            |
| [x]     | Membership privacy         | Returns not-found style failures for organization non-members instead of disclosing membership state.                                          |
| [x]     | First user bootstrap       | Makes the first upserted user a platform administrator unless a role is explicitly supplied.                                                   |

### Infrastructure Registries

| Checked | Feature                  | Supported behavior                                                                                                                                            |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Locations                | Lists and gets locations for support/admin users; administrators can create and delete unused locations.                                                      |
| [x]     | Location providers       | Supports `local`, `infomaniak`, `ovh`, `scaleway`, `hetzner`, and `exoscale`.                                                                                 |
| [x]     | Compute registries       | Creates Kubernetes compute registries with kubeconfig and ingress host; lists, gets, and deletes unused registries for support/admin users.                   |
| [x]     | Compute inspection       | Inspects cluster resources, managed namespaces, pods, and pod usage when metrics are available.                                                               |
| [x]     | Database registries      | Creates PostgreSQL registries with control-plane and optional runtime connection details; lists, gets, and deletes unused registries for support/admin users. |
| [x]     | Database inspection      | Inspects backend databases, schemas, and aggregate non-system database storage usage.                                                                         |
| [x]     | Storage registries       | Creates S3-compatible storage registries with control-plane and optional runtime endpoints; administrators can delete unused registries.                      |
| [x]     | Storage secret redaction | Exposes storage access key IDs without exposing secret access keys.                                                                                           |
| [x]     | Storage inspection       | Inspects buckets and up to 1000 object metadata rows per bucket.                                                                                              |

### Organizations

| Checked | Feature                               | Supported behavior                                                                                                                          |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Organization creation                 | Lets authenticated users create organizations and become owner.                                                                             |
| [x]     | Organization deletion                 | Lets owners and platform administrators soft-delete organizations and queue immediate runtime resource removal with delay-ready scheduling. |
| [x]     | Organization infrastructure bootstrap | Best-effort initializes compute namespace, organization database, shared users table, and shared storage bucket.                            |
| [x]     | Organization details                  | Lets members fetch an organization with location, users, pending invitations, and applications.                                             |
| [x]     | Organization listing                  | Lets support/admin users list all organizations.                                                                                            |
| [x]     | Organization applications             | Lets members list active applications in an organization, including caller application role when present.                                   |
| [x]     | Organization invitations              | Lets maintainers/admins/owners create pending email invitations while rejecting duplicates and existing members.                            |
| [x]     | Member role update                    | Lets organization admins/owners update active member roles and resync shared users.                                                         |
| [x]     | Organization database resources       | Shows expected shared/app database resources with availability status and usage metrics.                                                    |
| [x]     | Organization table preview            | Previews columns and up to 100 rows for shared users or app schema tables; system schemas are blocked.                                      |
| [x]     | Organization storage resources        | Shows expected shared/app buckets with availability status.                                                                                 |

### Applications

| Checked | Feature                             | Supported behavior                                                                                                                      |
| ------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Image metadata inspection           | Reads LongLink OCI image labels for app metadata and environment requirements.                                                          |
| [x]     | Image registry safety               | Rejects private/local/non-public image registries unless development mode explicitly allows the configured local registry.              |
| [x]     | Icon catalog                        | Returns supported Lucide icon slugs and validates normalized app icons.                                                                 |
| [x]     | Application creation and deployment | Creates apps from images, selects location registries, provisions resources, and queues verification.                                   |
| [x]     | Application deletion                | Lets permitted users soft-delete applications and queue immediate runtime resource removal with delay-ready scheduling.                 |
| [x]     | Required application envs           | Requires image-declared envs unless they are platform-managed.                                                                          |
| [x]     | Platform env injection              | Strips user-supplied `LONGLINK_` envs and injects production database/storage runtime values.                                           |
| [x]     | Application status model            | Supports `creating`, `running`, and `failed`.                                                                                           |
| [x]     | Application verification            | Marks apps running when rollout pods are ready and failed when current rollout pods crash.                                              |
| [x]     | Global application listing          | Lets platform administrators list all active applications.                                                                              |
| [x]     | Application logs                    | Lets application maintainers/admins and elevated organization members fetch recent plain-text logs from the newest application pod.     |
| [x]     | Application proxy                   | Proxies `GET`, `POST`, `PATCH`, and `DELETE` non-root paths into running application services for users with application access.        |
| [x]     | Application access roles            | Uses application membership roles for runtime access, with elevated organization roles allowed to manage application lifecycle actions. |
| [x]     | Proxy header policy                 | Strips unsafe request/response headers, injects `x-user-id`, and returns no-store 503 for unavailable apps.                             |
| [x]     | Registry selection                  | Uses the newest active compute/storage registry for the organization location and stores runtime registry references.                   |
| [x]     | Managed resource naming             | Validates slugs and managed Kubernetes/PostgreSQL/S3 resource names before provisioning.                                                |

### Operations and Adapters

| Checked | Feature                                   | Supported behavior                                                                                                       |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [x]     | Operation records                         | Stores operation kind, step, app/org references, scheduled time, timestamps, errors, lease metadata, and derived status. |
| [x]     | Operation listing                         | Lets support/admin users list operations newest first.                                                                   |
| [x]     | Background operation scheduler            | Claims scheduled/expired operations, runs handlers, renews leases, and keeps polling without blocking requests.          |
| [x]     | Operation leases                          | Requires matching lease tokens for claim, complete, fail, defer, and renew operations.                                   |
| [x]     | Application create verification operation | Supports `application.create` step `verify` for checking rollout health.                                                 |
| [x]     | Application delete cleanup operation      | Supports `application.delete` step `remove` for deleting managed app runtime resources.                                  |
| [x]     | Organization delete cleanup operation     | Supports `organization.delete` step `remove` for deleting managed organization runtime resources.                        |
| [x]     | Kubernetes provisioning                   | Creates managed namespaces plus one Secret, Deployment, and ClusterIP Service per app.                                   |
| [x]     | Kubernetes service proxy                  | Proxies requests through the Kubernetes service proxy API.                                                               |
| [x]     | PostgreSQL provisioning                   | Creates organization databases, shared users table, app schemas, runtime login roles, and grants.                        |
| [x]     | PostgreSQL resource inspection            | Inspects databases, schemas, usage, tables, and preview rows.                                                            |
| [x]     | S3-compatible provisioning                | Creates or reuses shared and app buckets from managed slugs.                                                             |
| [x]     | S3-compatible resource inspection         | Lists buckets and object metadata for storage browsers.                                                                  |
| [x]     | Invitation email utility                  | Provides MJML/SMTP invitation email helpers when email settings are complete.                                            |

## Python SDK

### Runtime

| Checked | Feature                   | Supported behavior                                                                                     |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| [x]     | SDK exports               | Exports app, router, user, XML, env, database, app/shared storage, and import-time runtime objects.    |
| [x]     | SDK environment model     | Reads `LONGLINK_` runtime mode, database, and storage settings from process env.                       |
| [x]     | App env file loading      | Loads app-defined `.env` and `.env.sample` settings while ignoring extra keys.                         |
| [x]     | SDK package data          | Packages static web and XSD assets and requires Python 3.14 or newer.                                  |
| [x]     | LongLink FastAPI app      | Includes SDK routes, audit middleware, optional i18n/pages, frontend assets, and development CORS.     |
| [x]     | SDK i18n route            | Mounts `src/i18n` under `/i18n` when translation files exist.                                          |
| [x]     | SDK XML page discovery    | Validates XML files in `src/pages` against XSD and registers them as GET routes under `/pages/...xml`. |
| [x]     | SDK frontend entrypoint   | Serves the bundled SDK web app at `/` and mounts `/assets` when available.                             |
| [x]     | SDK development CORS      | Allows localhost origins `3000`, `5173`, and `8000` in development mode.                               |
| [x]     | SDK router compatibility  | Provides a thin FastAPI `APIRouter` wrapper.                                                           |
| [x]     | SDK dev log filter        | Hides noisy frontend GET logs while keeping mutating, `/api/`, and `/auth/` logs.                      |
| [x]     | App metadata loading      | Loads metadata from `[tool.longlink]`, then PEP 621 `[project]`, with defaults.                        |
| [x]     | Runtime metadata endpoint | Returns app name, title, summary, description, version, and discovered pages.                          |
| [x]     | Page navigation metadata  | Provides page tab, path, and optional name/icon parsed from XML root metadata.                         |

### CLI and Packaging

| Checked | Feature                        | Supported behavior                                                                                      |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [x]     | CLI command group              | Exposes `build`, `dev`, `docs`, `init`, `migrate`, `test`, and `translations`.                          |
| [x]     | App scaffold creation          | Creates a new app scaffold and rejects non-empty targets.                                               |
| [x]     | Scaffold GitHub CI             | Adds GitHub Actions test and release workflows; GitHub is the only supported CI provider.               |
| [x]     | Local dev server               | Runs `main:app` with uvicorn reload on `0.0.0.0:1707` and interactive shortcuts when available.         |
| [x]     | App test command               | Runs application tests with pytest and forwards pytest arguments.                                       |
| [x]     | App migration command          | Applies pending migrations, autogenerates a revision if schema changes exist, then reapplies.           |
| [x]     | Docker image build             | Builds a Docker image in a temporary context, optionally tags, pushes, and reports image details.       |
| [x]     | Generated Docker runtime       | Runs app migrations before starting `uvicorn main:app` on port 80.                                      |
| [x]     | Image metadata labels          | Writes LongLink app metadata and environment metadata into image labels.                                |
| [x]     | Environment metadata labels    | Reads annotated `src/envs.py` fields and emits typed required/optional environment definitions.         |
| [x]     | Build context filtering        | Excludes local secrets, local databases, caches, generated directories, and `node_modules`.             |
| [x]     | XML component docs CLI         | Renders component docs from XSD.                                                                        |
| [x]     | Translation catalog generation | Scans XML `i18n` keys, preserves existing/plural translations, rejects collisions, and writes catalogs. |

### Database, Audit, and Storage

| Checked | Feature                       | Supported behavior                                                                                           |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [x]     | Database facade               | Exposes `Table` and async `get_session()`.                                                                   |
| [x]     | Table base model              | Adds audit timestamps, soft-delete fields, user foreign keys, and user relationships.                        |
| [x]     | Database environment URLs     | Uses in-memory SQLite for testing, `./dev.db` for development, and normalized `DATABASE_URL` for production. |
| [x]     | Database URL normalization    | Converts PostgreSQL URLs to asyncpg, strips `sslmode`, and preserves unrelated query parameters.             |
| [x]     | SQLite autocreate and seed    | Auto-creates SQLModel tables and seeds deterministic local users for SQLite.                                 |
| [x]     | Local user roles              | Provides deterministic local/test users for `read`, `write`, `maintain`, `admin`, and `owner`.               |
| [x]     | Audit header scope            | Reads `x-user-id` as UUID and binds it for request audit attribution.                                        |
| [x]     | Audit auto fields             | Fills create/update audit fields and converts hard deletes on SDK tables into soft deletes.                  |
| [x]     | App Alembic migrations        | Discovers app models, excludes shared `users`, skips empty revisions, and applies app migrations.            |
| [x]     | Production schema search path | Uses app schema plus `public` when `DATABASE_SCHEMA` is set.                                                 |
| [x]     | SDK auth boundary             | Provides local users and audit attribution, but no login or permission system.                               |
| [x]     | Environment storage backends  | Uses fsspec memory FS for testing, local file FS for development, and parsed `STORAGE_URL` for production.   |
| [x]     | S3 endpoint URL parsing       | Creates an S3 filesystem from `s3+http://key:secret@endpoint` style URLs.                                    |
| [x]     | App bucket scope              | Scopes app paths to `STORAGE_BUCKET` with `DirFileSystem`.                                                   |
| [x]     | Shared bucket scope           | Exposes `shared_fs` and `create_shared_fs()` scoped to `STORAGE_SHARED_BUCKET` when configured.              |

### XML Utilities and Scaffold

| Checked | Feature                      | Supported behavior                                                                                                     |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [x]     | XML element validation       | Validates XML from file or memory against XSD with unsafe XML parser features disabled.                                |
| [x]     | XML metadata parse           | Parses `<longlink>` XML metadata for page metadata extraction.                                                         |
| [x]     | XML schema root              | Defines the XSD entrypoint for root/app, state/query/loop/action, text, layout, input, table, tabs, and menu adapters. |
| [x]     | Schema-backed component docs | Uses XSD adapter files to generate XML component docs.                                                                 |
| [x]     | Scaffold app entrypoint      | New apps include `main.py` with LongLink app setup and demo routers.                                                   |
| [x]     | Scaffold env sample          | New apps include required and optional environment examples.                                                           |
| [x]     | Scaffold inventory API       | Demo inventory feature includes table, schemas, service, list route, and create route.                                 |
| [x]     | Scaffold file API            | Demo documents feature lists, uploads, downloads, and deletes files through SDK storage.                               |
| [x]     | Scaffold submission API      | Demo form/order endpoints echo submitted payloads.                                                                     |
| [x]     | Scaffold XML showcase        | New apps include XML pages for inventory, documents, forms, cart, quote, menu, and localized text.                     |
| [x]     | Scaffold initial migration   | New apps include an initial inventory Alembic migration.                                                               |
| [x]     | Scaffold testing mode        | New app tests use `LONGLINK_ENV=testing`, in-memory database settings, and a smoke test.                               |

## Web Frontend

### Build Modes and Routing

| Checked | Feature               | Supported behavior                                                                                                                   |
| ------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [x]     | API web build mode    | Builds the public/docs/control-plane bundle into `api/src/.static/web`.                                                              |
| [x]     | SDK web build mode    | Builds the embedded SDK runtime bundle into `sdk/longlink/.static/web`.                                                              |
| [x]     | API URL resolution    | Supports `VITE_API_URL` API prefixing and credentialed requests.                                                                     |
| [x]     | SDK user header       | Adds `x-user-id` from local storage in SDK mode unless already supplied.                                                             |
| [x]     | Lucide icon assets    | Serves and emits `/lucide-icons/*.svg` for icon loading by slug.                                                                     |
| [x]     | API route tree        | Exposes public, docs, legal, organization, settings, admin, resource, and proxied app routes.                                        |
| [x]     | SDK wildcard route    | Routes every SDK-mode path to the SDK application view.                                                                              |
| [x]     | Auth guard            | Shows sign-in for anonymous users, enforces platform role hierarchy, and renders 404 for insufficient access.                        |
| [x]     | Organization app view | Resolves org/app slugs, enforces app access roles, fetches proxied metadata, renders XML pages, and exposes logs to permitted users. |
| [x]     | Top layout shell      | Provides shared header, brand, breadcrumbs, and active tabs.                                                                         |
| [x]     | XML app layout shell  | Provides app tab navigation, tab icons, SDK docs link, and SDK user selector.                                                        |
| [x]     | Docs layout           | Provides docs sidebar, breadcrumbs, table of contents, active scroll tracking, metadata, and edit links.                             |
| [x]     | Legal layout          | Provides shared public legal page layout.                                                                                            |
| [x]     | Not found page        | Renders a shared 404 with current path and navigation links.                                                                         |

### Pages and Workspaces

| Checked | Feature                       | Supported behavior                                                                                                                            |
| ------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Public home page              | Renders the marketing landing page with navbar, hero CTA, and feature cards.                                                                  |
| [x]     | Pricing page                  | Exposes `/pricing` with Starter, Team, and Platform pricing options.                                                                          |
| [x]     | Legal pages                   | Exposes impressum, privacy, and terms pages with minimal legal content.                                                                       |
| [x]     | Documentation catalog         | Exposes docs pages for API, self-hosting, SDK, environments, routes, storage, database, testing, building, XML pages, layout, and components. |
| [x]     | XML docs reference            | Documents XML state, query, loops, conditions, i18n, expressions, invalidation, layout tags, and component tags.                              |
| [x]     | Docs heading anchors          | Auto-slugs headings and renders hover anchor links.                                                                                           |
| [x]     | Organizations page            | Shows sign-in for anonymous users; authenticated users list memberships and create organizations.                                             |
| [x]     | User settings page            | Lets users edit name/email, theme/accent/radius preferences, list organizations, and create organizations.                                    |
| [x]     | Organization shell            | Resolves organization slug and renders applications, people, database, storage, and settings sections.                                        |
| [x]     | Organization applications UI  | Lists organization applications and links to proxied app views.                                                                               |
| [x]     | Organization people UI        | Shows members/invitations, supports invitations, and supports member role changes for allowed roles.                                          |
| [x]     | Organization settings UI      | Shows organization details, permission role docs, apps, resources, logs, and app creation.                                                    |
| [x]     | Organization database browser | Lists database resources, browses schemas/shared tables, and previews table rows.                                                             |
| [x]     | Organization storage browser  | Lists storage resources and bucket details.                                                                                                   |
| [x]     | Admin shell                   | Provides support/admin tabs for users, apps, organizations, locations, database, storage, compute, and operations.                            |
| [x]     | Admin users UI                | Lists users, roles, emails, OIDC subjects, and copy actions.                                                                                  |
| [x]     | Admin applications UI         | Lists all applications with organization, status, image, and location context.                                                                |
| [x]     | Admin organizations UI        | Lists organizations and lifecycle users.                                                                                                      |
| [x]     | Admin locations UI            | Lists locations and supports administrator-only location creation.                                                                            |
| [x]     | Admin database UI             | Manages database registries and browses usage, databases, and schemas.                                                                        |
| [x]     | Admin storage UI              | Manages storage registries and browses buckets and object metadata.                                                                           |
| [x]     | Admin compute UI              | Manages compute registries and browses resources, namespaces, pods, and pod usage.                                                            |
| [x]     | Admin operations UI           | Lists scheduled, active, completed, and failed operations with timestamps, step, resource ids, and errors.                                    |

### Clients, Hooks, and Components

| Checked | Feature                       | Supported behavior                                                                                                                                    |
| ------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Fetch helpers                 | Normalize JSON/text/void fetches, headers, credentials, SDK user headers, URL prefixing, and API errors.                                              |
| [x]     | Query hooks                   | Wrap React Query with collection fallbacks, 401 session clearing, 404 handling, and query keys.                                                       |
| [x]     | Auth hooks                    | Support current user fetching, password login, OIDC redirects, saved accounts, logout, profile menu, and theme application.                           |
| [x]     | Login redirect sanitization   | Normalizes login redirects to same-origin relative paths and rejects external or malformed values.                                                    |
| [x]     | SDK user hooks                | Provides deterministic SDK users for `read`, `write`, `maintain`, `admin`, and `owner`.                                                               |
| [x]     | Resource hooks                | Provides typed hooks for users, orgs, apps, locations, databases, storages, computes, operations, metadata, and mobile breakpoint detection.          |
| [x]     | Organization mutation helpers | Supports create organization, invite member, change member role, and create application flows.                                                        |
| [x]     | Create application dialog     | Supports image inspection, metadata review, icon selection, env entry, and app creation.                                                              |
| [x]     | Registry connection dialogs   | Create database, storage, and compute registries with location selection.                                                                             |
| [x]     | Create location dialog        | Supports administrator-only location creation.                                                                                                        |
| [x]     | Create organization dialog    | Supports organization creation with name, avatar URL, and location.                                                                                   |
| [x]     | Logs dialog                   | Fetches application logs only while open and displays logs/errors.                                                                                    |
| [x]     | Delete confirmation dialog    | Provides reusable destructive confirmation UI for supported destructive resource actions.                                                             |
| [x]     | Data table component          | Wraps TanStack Table with loading, empty, error, and column class support.                                                                            |
| [x]     | Code block component          | Renders syntax-highlighted code blocks with clipboard copy toast.                                                                                     |
| [x]     | UI primitive catalog          | Provides shared UI primitives for React pages and the XML adapter subset.                                                                             |
| [x]     | UI primitive files            | Includes primitives such as buttons, dialogs, fields, tables, menus, navigation, overlays, layout, typography, feedback, and data display components. |

## XML Runtime

### Core

| Checked | Feature                | Supported behavior                                                                                                                                                                      |
| ------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | XML parser             | Parses XML into AST, preserves attributes, removes whitespace, ignores declarations/comments, and rejects visible literal text or malformed XML.                                        |
| [x]     | XML component registry | Maps supported XML tag names explicitly to React adapters.                                                                                                                              |
| [x]     | XML renderer           | Initializes setup state/query nodes, loads translations, subscribes to Valtio state, scopes errors, and renders AST nodes.                                                              |
| [x]     | XML execution context  | Provides runtime scope, setup registration, query invalidation, locale, translations, and state preservation.                                                                           |
| [x]     | XML URL sandbox        | Allows safe links and requires Query/Action request URLs to be app-relative.                                                                                                            |
| [x]     | XML translations       | Resolves dotted keys, plural objects, `count`, and `{{placeholder}}` interpolation.                                                                                                     |
| [x]     | XML expressions        | Supports refs, dotted paths, typed expressions, interpolation, literals, identifiers, member access, arithmetic, `in`, arrays, objects, and templates while blocking unsafe properties. |
| [x]     | XML form bindings      | Binds form controls to reactive state and handles number/file input normalization.                                                                                                      |

### Setup, Actions, and Data

| Checked | Feature             | Supported behavior                                                                                                            |
| ------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [x]     | XML root/setup tags | `longlink`, `State`, `Query`, and `For` provide metadata, local state, JSON setup fetches, and scoped iteration.              |
| [x]     | XML actions         | Sends app-relative `GET`, `POST`, `PATCH`, or `DELETE` requests with JSON or multipart form payloads and invalidates queries. |
| [x]     | XML queries         | Fetches JSON from app-relative paths during setup and exposes results under a query id.                                       |
| [x]     | XML state           | Initializes local reactive state from literal `State` attributes.                                                             |
| [x]     | XML loop rendering  | Iterates array-like expression results and exposes each item under a local alias.                                             |

### Components

| Checked | Feature                | Supported behavior                                                                                                                    |
| ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [x]     | Text components        | Supports headings, paragraphs, links, inline text styles, code/pre, lists, breaks, and separators.                                    |
| [x]     | Layout components      | Supports columns, grids, stacks, flex rows, cards, hero slots, tabs, dialogs, and menus.                                              |
| [x]     | Form components        | Supports buttons, fields, labels, inputs, textareas, input groups, checkboxes, switches, sliders, toggles, radio groups, and selects. |
| [x]     | Visual components      | Supports Lucide icons, badges, avatars, avatar images/fallbacks, and avatar badges.                                                   |
| [x]     | Table components       | Supports semantic tables and query-backed data tables with headers, cells, row scope, and empty messages.                             |
| [x]     | Registered render tags | Includes the currently registered XML render tags for text, layout, forms, tables, dialogs, menus, badges, avatars, and icons.        |
| [x]     | Special setup tags     | Handles `State`, `Query`, and `For` outside the render registry.                                                                      |

## Local Development and Testing

| Checked | Feature                    | Supported behavior                                                                                                                         |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [x]     | Workspace install targets  | Installs API, SDK, and web dependencies through workspace-specific targets.                                                                |
| [x]     | Workspace format targets   | Runs API import sorting, SDK import sorting, and web/repository Prettier formatting.                                                       |
| [x]     | Workspace test targets     | Runs API pytest, SDK pytest, web tests, web typecheck, and both web bundle builds.                                                         |
| [x]     | Web build targets          | Typechecks and builds API and SDK web bundles.                                                                                             |
| [x]     | Local service dependencies | Provides PostgreSQL, MinIO, local OCI registry, and Keycloak through Docker Compose.                                                       |
| [x]     | Local compute cluster      | Creates or reuses a k3d `compute` cluster, writes kubeconfig, and waits for service readiness.                                             |
| [x]     | Local seed workflow        | Starts services, scaffolds a dev SDK app if needed, builds/pushes its image, runs migrations, and seeds the API.                           |
| [x]     | Clean targets              | Removes generated test/build artifacts, static web bundles, caches, and local SDK images.                                                  |
| [x]     | Pyright targets            | Runs API and SDK type checks.                                                                                                              |
| [x]     | Web test workflow          | Runs Bun tests, TypeScript build mode, and both Vite bundle builds.                                                                        |
| [x]     | SDK test coverage areas    | Covers storage, database/migrations, router behavior, page/i18n routes, logging, CLI commands, and XML schemas.                            |
| [x]     | API test coverage areas    | Covers routes, adapters, operations, database services, image inspection, auth, locations, registries, apps, icons, and mail helpers.      |
| [x]     | Web test coverage areas    | Covers API helpers, auth roles, XML layout, docs anchors, XML parser/context/rendering/query/actions/adapters/expressions, and URL safety. |

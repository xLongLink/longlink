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

| Feature                   | Supported behavior                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted platform API       | Manages authentication, users, organizations, infrastructure registries, application deployment, operations, logs, and application proxying. |
| Python SDK                | Provides a FastAPI app runtime, CLI, database helpers, storage helpers, XML page discovery, metadata, scaffolding, and image packaging.      |
| API-mode frontend         | Serves public pages, docs, authenticated control-plane pages, organization pages, admin pages, and proxy-backed app views.                   |
| SDK-mode frontend         | Serves a local embedded app runtime that renders XML pages from `/metadata.json` without control-plane pages.                                |
| Declarative XML app model | Supports XML-defined pages with setup state, data queries, actions, expressions, translations, form bindings, and registered UI components.  |
| Local-first workflow      | Supports local services, SDK app scaffolding, image build/push, migrations, seeding, local API server, and local Vite web server.            |

## Control Plane

### Runtime

| Feature                     | Supported behavior                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API application bootstrap   | Creates the FastAPI app, includes control-plane routers, disables Swagger UI, exposes ReDoc/OpenAPI, mounts the web bundle when available, and starts the operation scheduler. |
| Built web serving           | Serves the API-mode web bundle from `api/src/.static/web` when that directory exists.                                                                                          |
| Browser sessions            | Uses the `longlink_session` cookie and session-backed active account state.                                                                                                    |
| CORS policy                 | Allows credentialed CORS for configured origins, with localhost defaults in development.                                                                                       |
| Logo SVG endpoint           | `GET /logo.svg` returns a no-store randomized LongLink wordmark SVG with an accent color and `theme=system`, `theme=light`, or `theme=dark` text color.                        |
| Health endpoint             | `GET /api/healthz` returns `{"status":"ok"}`.                                                                                                                                  |
| Domain error responses      | Returns JSON `detail` responses with route-specific HTTP status codes and stable conflict messages for managed resource-name validation.                                       |
| Control database sessions   | Provides cached async SQLAlchemy sessions, connection verification, and database URL normalization.                                                                            |
| Control database migrations | Migrates users, organizations, applications, registries, memberships, invitations, and operations, and supports percent-encoded database URLs.                                 |
| Local seed script           | Seeds local location, registries, organization, app metadata, and runtime data through public API routes.                                                                      |
| Local runtime endpoints     | Separates host-facing endpoints from pod-facing runtime endpoints for S3-compatible storage.                                                                                   |

### Authentication and Access

| Feature                    | Supported behavior                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OIDC login redirect        | Starts OIDC login, supports Keycloak provider hints for `github` and `google`, and stores safe same-origin `next` paths.                                      |
| OIDC callback user sync    | Exchanges the authorization code, validates verified-email userinfo, upserts the user, syncs organization shared users, activates the account, and redirects. |
| Saved session accounts     | Lists saved accounts, activates a saved account, and deactivates the active account.                                                                          |
| Logout                     | Removes the active account from the session through `POST /auth/logout` and returns `{ok:true}`.                                                              |
| Current user profile       | Returns identity, platform role, preferences, and organization memberships.                                                                                   |
| Profile preferences update | Updates mutable profile fields and preferences while keeping email provider-owned, then resyncs organization database users.                                  |
| User listing               | Allows support and administrator users to list all platform users.                                                                                            |
| Role model                 | Supports platform roles, organization roles, and application roles.                                                                                           |
| Membership privacy         | Returns not-found style failures for organization non-members instead of disclosing membership state.                                                         |
| First user bootstrap       | Makes the first upserted user a platform administrator unless a role is explicitly supplied.                                                                  |

### Infrastructure Registries

| Feature                  | Supported behavior                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locations                | Lists and gets locations for support/admin users; administrators can create and delete unused locations with ISO country codes.                                                                      |
| Country options          | Returns pycountry-backed ISO country options for organization and location selectors.                                                                                                                |
| Location providers       | Supports `local`, `infomaniak`, `ovh`, `scaleway`, `hetzner`, and `exoscale`.                                                                                                                        |
| Compute registries       | Creates Kubernetes-only compute registries with kubeconfig, gateway host, optional LoadBalancer IP, and production TLS material; lists, gets, and deletes unused registries for support/admin users. |
| Compute inspection       | Inspects total and allocatable cluster resources, managed namespaces, managed-namespace pods, and pod usage when metrics are available.                                                              |
| Database registries      | Creates PostgreSQL registries with a single connection endpoint; lists, gets, and deletes unused registries for support/admin users.                                                                 |
| Database inspection      | Inspects managed organization databases, managed database schemas, and aggregate non-system database storage usage.                                                                                  |
| Storage registries       | Creates S3-compatible storage registries with control-plane and optional runtime endpoints; administrators can delete unused registries.                                                             |
| Storage secret redaction | Exposes storage access key IDs without exposing secret access keys.                                                                                                                                  |
| Storage inspection       | Inspects managed buckets and up to 1000 object metadata rows per managed bucket.                                                                                                                     |

### Organizations

| Feature                               | Supported behavior                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization creation                 | Lets authenticated users create organizations with a country in active locations and become owner.                                          |
| Organization deletion                 | Lets owners and platform administrators soft-delete organizations and queue immediate runtime resource removal with delay-ready scheduling. |
| Organization infrastructure bootstrap | Best-effort initializes compute namespace, organization database shared schema, and shared storage bucket.                                  |
| Organization shared users             | Sends complete member state to tenant shared users, syncs `deleted_at` explicitly, and preserves original creation timestamps.              |
| Organization details                  | Lets members fetch an organization with location, users, and applications; pending invitations are shown only to maintainers/admins/owners. |
| Organization listing                  | Lets support/admin users list all organizations.                                                                                            |
| Organization applications             | Lets members list active applications in an organization, including caller application role when present.                                   |
| Organization invitations              | Lets maintainers/admins/owners create pending email invitations up to their own role rank while rejecting duplicates and existing members.  |
| Member role update                    | Lets organization admins/owners update active member roles, requires owner authority for owner changes, and resyncs shared users.           |
| Organization database resources       | Shows existing shared/app database schemas with usage metrics to maintainers/admins/owners and fails when the backend cannot be inspected.  |
| Organization table preview            | Previews columns and up to 100 rows for shared schema or app schema tables; system schemas are blocked.                                     |
| Organization storage resources        | Shows existing shared/app buckets with usage metrics to maintainers/admins/owners and fails when the backend cannot be inspected.           |

### Applications

| Feature                             | Supported behavior                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image metadata inspection           | Reads LongLink OCI image labels plus the resolved manifest digest for app metadata and environment requirements.                                                                                                                               |
| Image registry safety               | Requires explicit registry hosts plus image tags or digests and only reads public unauthenticated image metadata from GHCR, Docker Hub, GitLab.com, and localhost in development/testing.                                                      |
| Icon catalog                        | Returns the fixed 30-icon Lucide runtime subset as a list and validates exact app icon slugs.                                                                                                                                                  |
| Application creation and deployment | Creates apps from images, records image/app/SDK versions, deploys the resolved image digest, selects registries, cleans failed partial runtime resources, and queues verification.                                                             |
| Application deletion                | Lets permitted users soft-delete applications and queue immediate runtime resource removal with delay-ready scheduling.                                                                                                                        |
| Required application envs           | Requires image-declared envs unless they are platform-managed and validates app env names, counts, and value sizes before deployment.                                                                                                          |
| Platform env injection              | Strips user-supplied `LONGLINK_` envs and injects production database and validated storage runtime values.                                                                                                                                    |
| Application status model            | Supports `creating`, `running`, and `failed`.                                                                                                                                                                                                  |
| Application verification            | Marks apps running when the current Deployment rollout is ready and failed when current rollout pods crash, hit terminal image/config wait reasons, or exceed the verification timeout.                                                        |
| Global application listing          | Lets platform administrators list all active applications.                                                                                                                                                                                     |
| Application logs                    | Lets application maintainers/admins and elevated organization members fetch recent plain-text logs from the newest application pod.                                                                                                            |
| Application gateway                 | Stores private API-to-cluster gateway URLs for deployed apps and routes runtime traffic through the API proxy, which authorizes users and forwards requests to secret-protected per-cluster Envoy gateways before internal service forwarding. |
| Application access roles            | Uses application membership roles for runtime access, with method-level role enforcement and elevated organization roles allowed to manage application lifecycle actions.                                                                      |
| Application member management       | Lets organization members view application permission rows and lets permitted app/org managers set or remove app roles up to their own role rank for org members.                                                                              |
| Gateway header policy               | Requires compute gateway secrets stored in Kubernetes Secrets, rejects unavailable apps with no-store 503, forwards only minimal browser content negotiation headers, and injects trusted `x-user-id` and `x-user-role` from the API proxy.    |
| Registry selection                  | Uses newest active compute registries and keeps database/storage registries consistent for all apps in an organization.                                                                                                                        |
| Managed resource naming             | Generates slugs with library-backed normalization, validates managed Kubernetes/PostgreSQL/S3 resource names before provisioning, and reports invalid derived names with stable 409 conflict responses.                                        |

### Operations and Adapters

| Feature                                   | Supported behavior                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operation records                         | Stores operation kind, step, app/org references, scheduled time, timestamps, broadly redacted bounded errors, lease metadata, and derived status.                                                                                                                       |
| Operation listing                         | Lets support/admin users list operations newest first.                                                                                                                                                                                                                  |
| Background operation scheduler            | Claims scheduled/expired operations, runs handlers, renews leases, defers retries with backoff, and keeps polling without blocking requests.                                                                                                                            |
| Operation leases                          | Requires matching lease tokens for claim, complete, fail, defer, and renew operations.                                                                                                                                                                                  |
| Application create verification operation | Supports `application.create` step `verify` for checking rollout health.                                                                                                                                                                                                |
| Application delete cleanup operation      | Supports `application.delete` step `remove` for deleting managed app runtime resources.                                                                                                                                                                                 |
| Organization delete cleanup operation     | Supports `organization.delete` step `remove` for deleting managed organization runtime resources.                                                                                                                                                                       |
| Kubernetes provisioning                   | Creates managed namespaces, gateway-only app ingress policies, one exact Secret, health-probed restricted Deployment, and ClusterIP Service per app, while refusing unmanaged namespace collisions.                                                                     |
| Kubernetes gateway                        | Installs and synchronizes a per-cluster Envoy gateway with Secret-backed route access, optional TLS termination, health probes, access logs, local rate limits, a production LoadBalancer Service or development Ingress, and routes to managed ClusterIP app services. |
| PostgreSQL provisioning                   | Creates organization databases, migrates the shared schema, creates app schemas, runtime login roles, and read/write app plus read-only shared grants.                                                                                                                  |
| PostgreSQL resource inspection            | Inspects databases, schemas, usage, tables, and preview rows.                                                                                                                                                                                                           |
| S3-compatible provisioning                | Creates or reuses assigned shared/app buckets, persists assignments, and validates runtime credentials for app read/write, shared read-only, and cross-app denial before injection.                                                                                     |
| S3-compatible resource inspection         | Lists buckets and object metadata for storage browsers.                                                                                                                                                                                                                 |
| Invitation email utility                  | Provides MJML/SMTP invitation email helpers when email settings are complete.                                                                                                                                                                                           |

## Python SDK

### Runtime

| Feature                   | Supported behavior                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK exports               | Exports app, router, XML, env, database, organization assets, app/shared storage, and import-time runtime objects.                                  |
| SDK environment model     | Reads `LONGLINK_` runtime mode, database, and storage settings from process env.                                                                    |
| App env file loading      | Loads app-defined `.env` and `.env.sample` settings while ignoring extra keys.                                                                      |
| SDK package data          | Packages static web and XSD assets and requires Python 3.14 or newer.                                                                               |
| LongLink FastAPI app      | Includes SDK routes, public runtime health, API-prefixed user routes, audit middleware, optional i18n/pages, frontend assets, and development CORS. |
| SDK i18n route            | Mounts `src/i18n` under `/i18n` when translation files exist.                                                                                       |
| SDK XML page discovery    | Validates XML files in `src/pages` against XSD and registers them as GET routes under `/pages/...xml`.                                              |
| Dynamic SDK page routes   | Derives browser routes and route params from page filenames such as `issues/[issue].xml`.                                                           |
| SDK frontend entrypoint   | Serves the bundled SDK web app at `/` and falls back to it for browser routes without shadowing API routes.                                         |
| SDK development CORS      | Allows localhost origins `3000`, `5173`, and `8000` in development mode.                                                                            |
| SDK router compatibility  | Provides a thin FastAPI `APIRouter` wrapper whose included routes are exposed under `/api`.                                                         |
| SDK testing client        | Provides a FastAPI-compatible `longlink.testing.TestClient` facade for SDK application tests.                                                       |
| SDK dev log filter        | Hides noisy frontend GET logs while keeping mutating, `/api/`, and `/auth/` logs.                                                                   |
| App metadata loading      | Loads metadata from `[tool.longlink]`, then PEP 621 `[project]`, with defaults.                                                                     |
| Runtime metadata endpoint | Returns app name, title, summary, description, version, and discovered pages.                                                                       |
| Page navigation metadata  | Provides page tab, path, derived browser route, and optional name/icon parsed from XML root metadata.                                               |

### CLI and Packaging

| Feature                        | Supported behavior                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI command group              | Exposes `build`, `dev`, `docs`, `init`, `migrate`, `test`, and `translations`.                                                                                |
| App scaffold creation          | Creates a new app scaffold and rejects non-empty targets.                                                                                                     |
| Scaffold GitHub CI             | Adds GitHub Actions test and release workflows; GitHub is the only supported CI provider.                                                                     |
| Local dev server               | Runs `main:app` with uvicorn reload on `0.0.0.0:1707` and interactive shortcuts when available.                                                               |
| App test command               | Runs application tests with pytest and forwards pytest arguments.                                                                                             |
| App migration command          | Applies pending migrations, autogenerates a revision if schema changes exist, then reapplies.                                                                 |
| Docker image build             | Builds a Docker image in a temporary context, validates generated image tags, optionally pushes, and reports image details.                                   |
| Generated Docker runtime       | Runs app migrations as a non-root user before starting `uvicorn main:app` on port 8000.                                                                       |
| Image metadata labels          | Writes LongLink app metadata and environment metadata into image labels.                                                                                      |
| Environment metadata labels    | Reads annotated fields from the `[tool.longlink].environment` class, defaulting to `src.envs:Env`, and emits typed required/optional environment definitions. |
| Build context filtering        | Excludes local secrets, local databases, caches, generated directories, and `node_modules`.                                                                   |
| XML component docs CLI         | Renders component docs from XSD.                                                                                                                              |
| Translation catalog generation | Scans strict dotted XML `i18n` keys, preserves existing/plural translations, rejects invalid keys and collisions, and writes catalogs.                        |

### Database, Audit, and Storage

| Feature                       | Supported behavior                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database facade               | Exposes `Table`, `get_session()` as an async session context manager, and `get_session_maker()` for the async session factory.                    |
| Table base model              | Adds audit timestamps, soft-delete fields, user foreign keys, and user relationships.                                                             |
| Database environment settings | Uses in-memory SQLite for testing, `./dev.db` for development, and control-plane database components for production.                              |
| Production database URL build | Builds the asyncpg runtime URL from separate database host, port, name, username, and password settings.                                          |
| SQLite autocreate             | Auto-creates SQLModel tables for SQLite.                                                                                                          |
| Audit header scope            | Reads `x-user-id` as UUID and binds it for request audit attribution.                                                                             |
| Audit auto fields             | Fills create/update audit fields and converts hard deletes on SDK tables into soft deletes.                                                       |
| App Alembic migrations        | Discovers app models, excludes shared `users`, skips empty revisions, and applies app migrations.                                                 |
| Production schema search path | Uses app schema plus `shared` when `DATABASE_SCHEMA` is set.                                                                                      |
| Environment storage backends  | Uses fsspec memory FS for testing, local file FS for development, and platform S3 storage for production.                                         |
| S3 endpoint configuration     | Creates an S3 filesystem from separate control-plane endpoint URL, username, and password settings.                                               |
| App bucket scope              | Exposes `fs` and `create_fs(env, bucket)` scoped to `STORAGE_BUCKET` when configured.                                                             |
| Shared bucket scope           | Exposes `shared_fs` through `create_fs(env, bucket)` scoped to `STORAGE_SHARED_BUCKET` when configured.                                           |
| Organization assets           | Exposes `longlink.assets.logo()` using shared `tenant.storage.assets` definitions, SDK static fallback locally, and shared storage in production. |

### XML Utilities and Scaffold

| Feature                      | Supported behavior                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XML element validation       | Validates XML from file or memory against XSD with unsafe XML parser features disabled.                                                                                                                                   |
| XML metadata parse           | Parses `<longlink>` XML metadata for page metadata extraction.                                                                                                                                                            |
| XML schema root              | Defines the XSD entrypoint for root/app, state/query/loop/action, text, layout, input, table, tabs, and menu adapters.                                                                                                    |
| Schema-backed component docs | Uses XSD adapter files to generate XML component docs.                                                                                                                                                                    |
| Scaffold app entrypoint      | New apps include `main.py` with LongLink app setup and the office-operations router.                                                                                                                                      |
| Scaffold env sample          | New apps include required and optional environment examples.                                                                                                                                                              |
| Scaffold request API         | New apps include purchase-request table, schemas, service, API-prefixed list/get/create/status routes, and attachment file routes.                                                                                        |
| Scaffold organization assets | New apps include an organization logo route and dashboard avatar that demonstrate consuming the SDK-managed `longlink.assets.logo()`.                                                                                     |
| Scaffold XML app             | New apps include dashboard, purchase-request list/detail, and settings XML pages covering navigation tabs, actions, queries, translations, local state, form controls, tables, menus, dialogs, files, and dynamic routes. |
| Scaffold initial migration   | New apps include an initial purchase-request Alembic migration.                                                                                                                                                           |
| Scaffold testing mode        | New app tests use `LONGLINK_ENV=testing`, in-memory database settings, `longlink.testing.TestClient`, and a smoke test.                                                                                                   |

## Web Frontend

### Build Modes and Routing

| Feature               | Supported behavior                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| API web build mode    | Builds the public/docs/control-plane bundle into `api/src/.static/web`.                                                                        |
| SDK web build mode    | Builds the embedded SDK runtime bundle into `sdk/longlink/.static/web`.                                                                        |
| API URL resolution    | Supports `VITE_API_URL` API prefixing and credentialed requests.                                                                               |
| Lucide icon subset    | Renders a fixed 30-icon Lucide subset directly in the web bundle and falls back to `box` for unsupported XML icon names.                       |
| API route tree        | Exposes public, docs, legal, organization, settings, admin, resource, and gateway-backed app routes.                                           |
| SDK wildcard route    | Routes every SDK-mode path to the SDK application view.                                                                                        |
| Auth guard            | Shows sign-in for anonymous users, enforces platform role hierarchy, and renders 404 for insufficient access.                                  |
| Organization app view | Resolves org/app slugs, enforces app access roles, fetches and validates gateway metadata, renders static/dynamic XML pages, and exposes logs. |
| Top layout shell      | Provides shared header, brand, breadcrumbs, and active tabs.                                                                                   |
| XML app layout shell  | Provides app tab navigation, tab icons, and SDK docs link.                                                                                     |
| Docs layout           | Provides docs sidebar, breadcrumbs, table of contents, active scroll tracking, metadata, and edit links.                                       |
| Legal layout          | Provides shared public legal page layout.                                                                                                      |
| Not found page        | Renders a shared 404 with current path and navigation links.                                                                                   |

### Pages and Workspaces

| Feature                       | Supported behavior                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public home page              | Renders the marketing landing page with navbar, hero CTA, compact feature cards, and centered post-card CTAs.                                 |
| Pricing page                  | Exposes `/pricing` with Free, Team, and Work pricing options.                                                                                 |
| Legal pages                   | Exposes impressum, privacy, and terms pages with minimal legal content.                                                                       |
| Documentation catalog         | Exposes docs pages for API, self-hosting, SDK, environments, routes, storage, database, testing, building, XML pages, layout, and components. |
| Documentation topic icons     | Uses one explicit icon assignment per documentation topic.                                                                                    |
| XML docs reference            | Documents XML state, query, loops, conditions, i18n, expressions, invalidation, layout tags, and component tags.                              |
| Docs heading anchors          | Auto-slugs headings and renders hover anchor links.                                                                                           |
| Organizations page            | Shows sign-in for anonymous users; authenticated users list memberships and create organizations.                                             |
| User settings page            | Lets users edit name/language, theme/accent/radius preferences, view provider-owned email, list organizations, and create organizations.      |
| Organization shell            | Resolves organization slug and renders applications, people, database, storage, and settings sections.                                        |
| Organization applications UI  | Lists organization applications and links to proxied app views.                                                                               |
| Organization people UI        | Shows members/invitations, supports invitations, and supports member role changes for allowed roles.                                          |
| Organization settings UI      | Shows organization details, apps, app permission management, resources, logs, and role-gated app creation.                                    |
| Organization database browser | Lists database resources, browses shared/app schemas, and previews table rows.                                                                |
| Organization storage browser  | Lists storage resources and bucket details.                                                                                                   |
| Admin shell                   | Provides support/admin tabs for users, apps, organizations, locations, database, storage, compute, and operations.                            |
| Admin users UI                | Lists users, roles, emails, OIDC subjects, and copy actions.                                                                                  |
| Admin applications UI         | Lists all applications with organization, status, image, and location context.                                                                |
| Admin organizations UI        | Lists organizations and lifecycle users.                                                                                                      |
| Admin locations UI            | Lists locations and supports administrator-only location creation.                                                                            |
| Admin database UI             | Manages database registries and browses managed databases and managed schemas.                                                                |
| Admin storage UI              | Manages storage registries and browses managed buckets and object metadata.                                                                   |
| Admin compute UI              | Manages compute registries and browses managed namespaces, pods, and pod usage.                                                               |
| Admin operations UI           | Lists scheduled, active, completed, and failed operations with timestamps, step, resource ids, and errors.                                    |

### Documentation Topic Icons

| Topic                    | Icon             |
| ------------------------ | ---------------- |
| Introduction             | `BookOpen`       |
| Control Plane Overview   | `ShieldCheck`    |
| Organizations            | `Building2`      |
| Applications             | `AppWindow`      |
| Self-hosted              | `ServerCog`      |
| Application SDK Overview | `Package`        |
| Environments             | `Globe`          |
| Routes                   | `Waypoints`      |
| Storage                  | `HardDrive`      |
| Database                 | `Database`       |
| Testing                  | `FlaskConical`   |
| Building                 | `Rocket`         |
| Pages                    | `FileCode2`      |
| Expressions              | `Braces`         |
| Layout                   | `LayoutTemplate` |
| Components               | `Component`      |

### Clients, Hooks, and Components

| Feature                       | Supported behavior                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fetch helpers                 | Normalize JSON/text/void fetches, optional response parsing, same-origin API paths, fixed credentials, URL prefixing, and API errors.                  |
| Query hooks                   | Wrap React Query with collection fallbacks, schema-backed parsing, 401 session clearing, 404 handling, and query keys.                                 |
| Auth hooks                    | Support current user fetching, saved accounts, logout, profile menu, and theme application.                                                            |
| Login redirect sanitization   | Normalizes login redirects to same-origin relative paths and rejects external or malformed values.                                                     |
| API page localization         | Provides bundled English and lazy-loaded Italian translations for public/control-plane UI through the user language preference, with English fallback. |
| Resource hooks                | Provides typed hooks for users, orgs, apps, locations, databases, storages, computes, operations, metadata, and mobile breakpoint detection.           |
| Organization mutation helpers | Supports create organization, invite member, change member role, and create application flows.                                                         |
| Create application dialog     | Supports schema-backed image inspection, metadata review, icon selection, env entry, and app creation.                                                 |
| Registry connection dialogs   | Create database, storage, and Kubernetes compute registries with location selection and schema-backed client validation.                               |
| Create location dialog        | Supports administrator-only schema-backed location creation.                                                                                           |
| Create organization dialog    | Supports schema-backed organization creation with name, avatar URL, country, and location.                                                             |
| Logs dialog                   | Fetches application logs only while open and displays logs/errors.                                                                                     |
| Delete confirmation dialog    | Provides reusable destructive confirmation UI for supported destructive resource actions.                                                              |
| Data table component          | Wraps TanStack Table with loading, empty, error, and column class support.                                                                             |
| Code block component          | Renders syntax-highlighted code blocks with clipboard copy toast.                                                                                      |
| UI primitive catalog          | Provides shared UI primitives for React pages and the XML adapter subset.                                                                              |
| UI primitive files            | Includes primitives such as buttons, dialogs, fields, tables, menus, navigation, overlays, layout, typography, feedback, and data display components.  |

## XML Runtime

### Core

| Feature                | Supported behavior                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XML parser             | Parses XML into AST, preserves attributes, removes whitespace, ignores declarations/comments, and rejects visible literal text, malformed XML, DOCTYPE, ENTITY, or CDATA constructs.                                                                                                                            |
| XML component registry | Maps supported XML tag names explicitly to React adapters.                                                                                                                                                                                                                                                      |
| XML renderer           | Initializes setup state/query nodes, loads translations, subscribes to Valtio state, scopes render/setup errors without exposing stack traces, and renders AST nodes.                                                                                                                                           |
| XML execution context  | Provides runtime scope, setup registration, query invalidation, locale, translations, and state preservation.                                                                                                                                                                                                   |
| XML URL sandbox        | Allows safe `href` links, requires `to` navigation plus Query/Action request URLs to be app-relative, and validates avatar image URL schemes.                                                                                                                                                                   |
| XML translations       | Resolves dotted keys, plural objects, `count`, and `{{placeholder}}` interpolation.                                                                                                                                                                                                                             |
| XML expressions        | Supports refs, dotted paths, typed expressions, robust interpolation, literals, identifiers, safe member access, arithmetic, comparisons, logical operators, ternaries, nullish coalescing, optional chaining, `in`, arrays, objects, templates, and whitelisted helper calls while blocking unsafe properties. |
| XML form bindings      | Binds form controls to reactive state and handles number/file input normalization.                                                                                                                                                                                                                              |

### Setup, Actions, and Data

| Feature             | Supported behavior                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| XML root/setup tags | `longlink`, `State`, `Query`, and `For` provide metadata, local state, JSON setup fetches, and scoped iteration.                                   |
| XML actions         | Resolves click-time app-relative `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` requests with JSON or multipart form payloads and invalidates queries. |
| XML queries         | Fetches JSON from expression-aware app-relative paths during setup and exposes results under a query id.                                           |
| XML state           | Initializes local reactive state from literal `State` attributes.                                                                                  |
| XML loop rendering  | Iterates array-like expression results and exposes each item under a local alias.                                                                  |

### Components

| Feature                | Supported behavior                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Text components        | Supports headings, paragraphs, app links, resource links, inline text styles, code, lists, breaks, and separators.                    |
| Layout components      | Supports columns, grids, stacks, flex rows, cards, hero slots, tabs, dialogs, and menus.                                              |
| Form components        | Supports buttons, fields, labels, inputs, textareas, input groups, checkboxes, switches, sliders, toggles, radio groups, and selects. |
| Visual components      | Supports Lucide icons, badges, avatars, safe avatar images/fallbacks, and avatar badges.                                              |
| Table components       | Supports query-backed data tables with safe field access, columns, headers, cell slots, row scope, and empty messages.                |
| Registered render tags | Includes the currently registered XML render tags for text, layout, forms, tables, dialogs, menus, badges, avatars, and icons.        |
| Special setup tags     | Handles `State`, `Query`, and `For` outside the render registry.                                                                      |

## Local Development and Testing

| Feature                    | Supported behavior                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace install targets  | Installs API, SDK, and web dependencies through workspace-specific targets.                                                                |
| Workspace format targets   | Runs API import sorting, SDK import sorting, and web/repository Prettier formatting.                                                       |
| Workspace test targets     | Runs API pytest, SDK pytest, web tests, web typecheck, and both web bundle builds.                                                         |
| Web build targets          | Typechecks and builds API and SDK web bundles.                                                                                             |
| Local service dependencies | Provides PostgreSQL, MinIO, local OCI registry, and Keycloak through Docker Compose.                                                       |
| Local compute cluster      | Creates or reuses a k3d `compute` cluster, writes kubeconfig, and waits for service readiness.                                             |
| Local seed workflow        | Starts services, scaffolds a dev SDK app if needed, builds/pushes its image, runs migrations, and seeds the API.                           |
| Clean targets              | Removes generated test/build artifacts, static web bundles, caches, and local SDK images.                                                  |
| Pyright targets            | Runs API and SDK type checks.                                                                                                              |
| Web test workflow          | Runs Bun tests, TypeScript build mode, and both Vite bundle builds.                                                                        |
| SDK test coverage areas    | Covers storage, database/migrations, router behavior, page/i18n routes, logging, CLI commands, and XML schemas.                            |
| API test coverage areas    | Covers routes, adapters, operations, database services, image inspection, auth, locations, registries, apps, icons, and mail helpers.      |
| Web test coverage areas    | Covers API helpers, auth roles, XML layout, docs anchors, XML parser/context/rendering/query/actions/adapters/expressions, and URL safety. |

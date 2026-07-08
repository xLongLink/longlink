# LongLink Agent Guide

LongLink is an open-source platform for building and running dedicated business-process applications. Companies constantly need software for workflows, approvals, procurement, onboarding, compliance, case handling, operations, and structured data management. These processes often follow recognizable patterns, but every company has different rules, roles, data, approvals, integrations, exceptions, and compliance requirements.

Today, companies usually handle this gap in one of three ways. They force the process into generic SaaS tools, which are often too rigid. They manage it with spreadsheets, dashboards, and manual coordination, which becomes fragile as the process grows. Or they build fully custom software, which solves the fit problem but is expensive because teams repeatedly rebuild the same foundation around every application.

LongLink provides that foundation once. It handles authentication, organizations, permissions, deployment, databases, storage, routing, logs, status, and a consistent application shell, while developers build each business-process application as normal Python software. Each application owns its specific logic, data model, validation, workflow, integrations, APIs, and pages.

The product model is closest to GitHub for business applications and workflows. GitHub made repositories the standard unit for managing code; LongLink makes deployable business applications the standard unit for running process software. It sits between generic SaaS and fully custom software: more flexible than closed business platforms, faster and more governed than rebuilding everything from scratch.

LongLink also avoids the lock-in of Salesforce, ServiceNow, Power Apps, SAP, and similar platforms, where customization often requires proprietary runtimes, specialist skills, and vendor-specific deployment models. Its advantage is that applications remain normal code, built with the Python stack many technical teams already know. This makes applications easier to understand, test, extend, review, deploy, and maintain over time.

The Python stack has an additional advantage in the AI era. Python and its major web, data, API, validation, testing, and database libraries are heavily represented in AI training data and developer workflows. As AI reduces the cost and barrier of producing software, LongLink benefits from using technologies that AI systems can work with more reliably than niche enterprise languages or proprietary configuration models. The result is another layer of simplification: teams can generate, review, test, and evolve process-specific applications faster, while still keeping the output inside a structured and maintainable platform model.

The wedge is the large volume of business processes that are too specific for generic SaaS but too common to justify rebuilding platform infrastructure repeatedly. LongLink can become the shared operating layer for these process-specific applications across teams, organizations, and eventually distribution channels. The long-term opportunity is a platform where reusable business-process applications can be built, adapted, deployed, governed, and operated with the same consistency that developers expect from modern software infrastructure.



## Goals

- Deliver faster custom applications by building on a shared foundation.
- Model business processes explicitly through data, validation, permissions, actions, workflow states, API behavior, and screens.
- Keep application development local-first while making production deployment platform-managed.
- Centralize identity, organization access, infrastructure, routing, operations, and application status.
- Keep applications portable across testing, development, and production environments.
- Reduce maintenance by handling authentication, storage, deployment, UI rendering, and operations once in the platform.
- Preserve a consistent user experience across control-plane pages and application runtimes.
- Let applications evolve with business requirements while keeping a stable runtime and deployment model.

## Architecture

```bash
longlink/
├── api/                          # Control plane: auth, organizations, applications, registries, orchestration
│   ├── main.py                   # FastAPI entrypoint
│   ├── seed.py                   # Local development seed data
│   ├── alembic/                  # Database migrations
│   ├── src/
│   │   ├── .static/web/          # Built API-mode web bundle
│   │   ├── adapters/             # Infrastructure adapters
│   │   ├── database/             # Database session, models, services
│   │   ├── models/               # FastAPI and domain schemas
│   │   ├── operations/           # Operation orchestration
│   │   ├── routes/               # FastAPI routes
│   │   ├── templates/            # Kubernetes and infrastructure templates
│   │   ├── utils/                # Shared utilities
│   │   ├── auth.py               # Authentication helpers
│   │   ├── constants.py          # Shared constants
│   │   ├── environments.py       # Environment configuration
│   │   ├── errors.py             # Error handling
│   │   └── logger.py             # Logging setup
│   └── tests/                    # API tests
├── sdk/                          # Python SDK: application runtime, CLI, scaffolding
│   ├── longlink/
│   │   ├── .static/
│   │   │   ├── web/              # Built SDK-mode web bundle
│   │   │   └── xsd/              # XML schema definitions
│   │   ├── cli/                  # CLI commands
│   │   ├── database/             # Database helpers and migrations
│   │   ├── routes/               # Runtime routes
│   │   ├── storage/              # Storage abstraction
│   │   ├── utils/                # Helpers and settings
│   │   ├── app.py                # FastAPI application factory
│   │   ├── pages.py              # Page metadata helpers
│   │   └── router.py             # Route registration
│   └── tests/                    # SDK tests
├── web/                          # Vite/React frontend, docs, XML runtime, API and SDK bundle modes
│   ├── src/
│   │   ├── components/           # Shared UI and dialogs
│   │   ├── hooks/                # React hooks
│   │   ├── layout/               # Layout shells
│   │   ├── lib/                  # API clients, theme, shared types
│   │   ├── pages/                # Control-plane pages and docs
│   │   └── xml/                  # XML parser, adapters, renderer, translations
│   └── tests/                    # Web and XML tests
└── dev/                            # Local services and reference material
    ├── compose.yml                 # Local service dependencies
    ├── keycloak-realm-dev.json     # Local Keycloak realm
    └── rfc/                        # Reference RFC material
```

## How it works

### Control plane

The control plane manages users, organizations, memberships, applications, locations, infrastructure registries, operations, routing, and deployment state. Users authenticate through OIDC and are stored in the control-plane database. Organizations define the tenant boundary, and memberships decide which users can access each organization and application.

Applications are added to the control plane as packaged container images. When an image is registered, the platform inspects its LongLink labels, creates the application record, stores metadata, checks organization access, receives required environment values, and starts the deployment workflow.

Infrastructure is connected through location-scoped registries. Compute registries point to Kubernetes clusters, database registries point to database servers, and storage registries point to S3-compatible storage backends. The control plane does not hard-code a single provider; adapters translate LongLink organizations and applications into resources on the selected backend.

Long-running work is tracked as operations. Application creation queues a verification operation that checks the deployed pods and moves the application to `running` or `failed`. Application deletion queues a removal operation that deletes runtime resources and marks the application deleted. The operation scheduler runs in the API process and keeps retrying pending work without blocking normal API requests.

Application access is routed through the per-cluster gateway. Users open organization application routes in the web shell; runtime metadata and API calls go to the selected compute gateway. The gateway asks the control plane to authorize each request, and the API verifies access, checks the application status, and returns trusted runtime identity headers before the gateway forwards traffic to the internal application service.

Production infrastructure is organized around organizations and applications. The control plane owns the setup, while adapters translate the platform model into the target backend.

Compute uses managed Kubernetes resources:

```bash
Cluster                         # Managed by the control plane
└── Namespace                   # One per organization
    ├── App A Deployment        # Deployment for App A
    ├── App A Service           # Internal ClusterIP Service for App A
    ├── App A Secret            # Secret containing all app configuration
    └── Gateway                 # Shared Envoy gateway service
```

Database uses one database per organization, one shared schema, and one schema per application:

```bash
Database Server                 # Managed through the database adapter
└── Organization Database        # One per organization
    ├── shared                   # Shared organization tables
    │   └── users                # Shared organization users
    ├── App A Schema             # Tables owned by App A
    └── App B Schema             # Tables owned by App B
```

File storage uses organization-scoped bucket names and isolated buckets per application:

```bash
Storage Backend                         # Managed through the storage adapter
├── Assigned organization bucket        # Optional organization-level objects
├── Assigned App A bucket               # Files owned by App A
└── Assigned App B bucket               # Files owned by App B
```

### Applications

LongLink applications are built locally first, then packaged and added to the platform. `longlink init` creates the application scaffold. `longlink dev` runs `main:app` with the SDK FastAPI runtime and the embedded SDK web bundle. `longlink build` packages the application as a Docker image with LongLink metadata and environment requirements attached as image labels.

The packaged image is the handoff between the SDK and the control plane. In local development, the application uses SQLite, local `fsspec` storage, seeded users, and local settings. In tests, it uses isolated in-memory services. In production, the platform provides runtime secrets, database access, storage configuration, routing, and deployment. The SDK storage layer uses `fsspec`, so application code can work with local, testing, and production filesystems through one interface.

The SDK exposes application metadata through `/metadata.json`. XML files discovered from the SDK pages directory are collected into that metadata, so the embedded web runtime can discover and render the application's pages. Normal FastAPI routes can still provide API behavior for the application.

| Area            | Testing                  | Development               | Production                               |
| --------------- | ------------------------ | ------------------------- | ---------------------------------------- |
| Runtime         | Test runtime             | SDK runtime               | Platform runtime                         |
| User management | Fixtures, auth overrides | Seeded local users        | OIDC users                               |
| Access model    | Isolated permissions     | Local role simulation     | Organization and application memberships |
| Database        | In-memory SQLite         | SQLite                    | PostgreSQL database and schemas          |
| File storage    | In-memory `fsspec`       | Local `fsspec` filesystem | S3-compatible buckets                    |
| Web bundle      | Test runtime             | SDK bundle                | API bundle and app rendering             |
| Environment     | Test settings            | Local settings            | Runtime secrets                          |
| Build command   | `longlink test`          | `longlink dev`            | `longlink build`                         |
| Deployment      | None                     | Local process             | Platform deployment                      |
| Operations      | Test assertions          | Local debugging           | Create, verify, delete, logs, status     |

Keep both web build modes working. API mode builds the authenticated control-plane and documentation bundle into `api/src/.static/web`. SDK mode builds the embedded local runtime bundle into `sdk/longlink/.static/web`. Do not remove Vite mode checks, output directories, SDK/API-specific behavior, or the shadcn/ui primitives in `web/src/components/ui/` unless the product model explicitly changes.


```xml
<longlink name="Tasks" icon="list-check">
  <State id="draft" title="" />
  <Query id="tasks" path="/api/tasks" />

  <H1 i18n="tasks.title" />
  <P i18n="tasks.count" count="${tasks.length}" />

  <Input value="$draft.title" placeholder="New task" />
  <Action action="/api/tasks" json="${{ title: draft.title }}" invalidate="${['tasks']}">
    <Button i18n="tasks.create" />
  </Action>

  <For each="$tasks" as="task">
    <P if="${task.status in ['open', 'pending']}" i18n="tasks.row" title="$task.title" />
  </For>
</longlink>
```


## Contributing model

- Keep things in one function unless composable or reusable
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Avoid try/catch where possible
- Avoid using the any type
- Keep changes small and clear
- Reduce complexity and remove dead code
- Enforce project conventions, normalize naming, improve readability
- Prefer established, well-maintained libraries for common concerns such as parsing, validation, routing, URL handling, forms, and i18n when they keep the code simpler than handwritten implementations.
- For FastAPI routes, declare `response_model` and return raw ORM objects, dictionaries, or primitive data; do not instantiate or `model_validate` response models only to validate route output.
- Prefer inlining simple, single-use local prop object types directly in component signatures.
- Keep local prop type aliases when the shape is shared, reused, or significantly complex.
- Prefer direct inline className expressions for one-off style values instead of temporary local `...ClassName` constants used only once or twice in JSX.
- Use cards only when the content needs a distinct visual container; do not wrap broad sections, routine forms, or whole pages in cards by default.
- Include two blank lines between function definitions
- Keep Python and JavaScript function definitions on one line when the full signature fits within the configured line length.
- Do not add new helper functions unless they are explicitly needed.
- Python functions must have docstrings, and any logic blocks must have preceding `# ...` comments.
- Keep one blank line before each logic-block comment so comments visually separate consecutive code blocks.
- Python files must not start with module-level triple-quoted docstrings; use comments only when a file header is needed. Alembic revision files may keep their generated revision header docstring.
- Do not add `__all__` unless a concrete public star-import contract requires it.
- JavaScript functions must have JSDoc comments, and non-trivial logic blocks must have preceding `// ...` comments.
- Keep `FEATURES.md` updated when supported behavior is added, removed, renamed, or materially changed.
- Always check at the end of the implementation, for potential simplifications.
- Write simple, well designed and maintainable code. No strange hacks, use proper solutions
- Pydantic models must group fields by commented sections, and fields inside each section must be ordered from shortest name to longest name.
- Use long domain names in code and filenames instead of abbreviations.
- Keep related model module names plural and consistent across the API and database layers.
- Prefer single word naming for python filenames, and prefer not renaming imports
- Prefer namespaced module APIs for related factories and facades instead of long function names imported directly. For example, use `from src import adapters` with `adapters.compute(registry)`, `adapters.database(registry)`, and `adapters.storage(registry)` rather than importing provider-specific constructors or verbose factory names into callers.
- Do NOT add any new test case unless the user specifically instruct you to do so.
- When asked to make a list of improvements, always returns a numeric for easy reference
- Avoid mocks as much as possible, you shouldn't be using globalThis.* at all unless it's the only option.
- Test actual implementation, do not duplicate logic into tests
- This project uses Python 3+. You should not use the __future__ module.

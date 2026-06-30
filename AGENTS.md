# LongLink Agent Guide

LongLink is a platform for building structured internal business applications: operational software for companies whose workflows are too specific for off-the-shelf SaaS, but too important to manage through spreadsheets, scripts, or isolated custom tools.

The core idea is to turn recurring business processes into maintainable application units. A LongLink application captures the process model: data, validation, permissions, actions, workflow states, API behavior, and user-facing screens. LongLink supplies the foundation around that model, including identity, organization context, routing, deployment, storage, infrastructure orchestration, and a consistent web experience.

A useful comparison is GitHub. GitHub gives software teams a common system for repositories without deciding what code they write. LongLink gives organizations a common system for internal applications without deciding how their business process works. In this model, the application is the unit of work in the same way a repository is the unit of work on GitHub.

The lifecycle starts by modeling a real process: what data is captured, which rules make it valid, who can act on it, and how it moves from state to state. Developers implement that model with the SDK, run and test it locally, then package it with the metadata and interface required by the platform. After deployment, the control plane handles access, organization context, routing, infrastructure, and operations. As requirements change, the application evolves in place while keeping the same structure and runtime expectations.

This approach creates leverage. Teams can deliver custom business software without starting from a blank stack each time, and shared concerns such as authentication, permissions, deployment, storage, UI rendering, and operational management are handled once by the platform. The result is faster delivery, clearer requirements, more consistent user experiences, easier maintenance, and applications that remain understandable as they grow.

LongLink is composed of three main parts. The `api/` package is the hosted control plane for users, organizations, applications, infrastructure, operations, and authenticated access. The `sdk/` package is the developer runtime for creating applications locally with Python, FastAPI, SQLAlchemy, storage helpers, CLI commands, and packaged schema assets. The `web/` package is the React interface for the public site, documentation, control-plane UI, and runtime rendering.

The frontend is delivered in two modes. API mode builds the authenticated control-plane and documentation experience into `api/src/.static/web`. SDK mode builds the smaller embedded runtime into `sdk/longlink/.static/web`, where local applications can be rendered without control-plane user state.

Follow the active architecture and MVP development model. Preserve the separation between the control plane, SDK runtime, and web build modes unless the product model explicitly changes.

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

The control plane is the hosted platform layer. It manages users, organizations, memberships, applications, locations, infrastructure registries, operations, routing, and deployment state. Users authenticate through OIDC and are stored in the control-plane database. Organizations define the tenant boundary, and memberships decide which users can access each organization and application.

Applications are added to the control plane as packaged container images. When an image is registered, the platform inspects its LongLink labels, creates the application record, stores metadata, checks organization access, receives required environment values, and starts the deployment workflow.

Infrastructure is connected through location-scoped registries. Compute registries point to Kubernetes clusters, database registries point to database servers, and storage registries point to S3-compatible storage backends. The control plane does not hard-code a single provider; adapters translate LongLink organizations and applications into resources on the selected backend.

Long-running work is tracked as operations. Application creation queues a verification operation that checks the deployed pods and moves the application to `running` or `failed`. Application deletion queues a removal operation that deletes runtime resources and marks the application deleted. The operation scheduler runs in the API process and keeps retrying pending work without blocking normal API requests.

Application access is routed through the control plane. Users enter through authenticated organization and application routes; the API verifies access, checks the application status, strips unsafe hop-by-hop headers, and proxies the request to the internal application service on the selected compute backend.

Production infrastructure is organized around organizations and applications. The control plane owns the setup, while adapters translate the platform model into the target backend.

Compute uses managed Kubernetes resources:

```bash
Cluster                         # Managed by the control plane
└── Namespace                   # One per organization
    ├── App A Deployment        # Deployment for App A
    ├── App A Service           # Internal ClusterIP Service for App A
    ├── App A Secret            # Secret containing all app configuration
    └── Proxy                   # Shared internal proxy service
```

Database uses one database per organization and one schema per application:

```bash
Database Server                 # Managed through the database adapter
└── Organization Database        # One per organization
    ├── public.users             # Shared organization users
    ├── App A Schema             # Tables owned by App A
    └── App B Schema             # Tables owned by App B
```

File storage uses one tenant per organization and isolated buckets per application:

```bash
Storage Backend                 # Managed through the storage adapter
└── Tenant                       # One per organization
    ├── Shared Bucket            # Optional organization-level objects
    ├── App A Bucket             # Files owned by App A
    └── App B Bucket             # Files owned by App B
```

### Applications

LongLink applications are built locally first, then packaged and added to the platform. `longlink init` creates the application scaffold. `longlink dev` runs `main:app` with the SDK FastAPI runtime and the embedded SDK web bundle. `longlink build` packages the application as a Docker image with LongLink metadata and environment requirements attached as image labels.

The packaged image is the handoff between the SDK and the control plane. In local development, the application uses SQLite, local `fsspec` storage, seeded users, and local settings. In tests, it uses isolated in-memory services. In production, the platform provides runtime secrets, database access, storage configuration, routing, and deployment. The SDK storage layer uses `fsspec`, so application code can work with local, testing, and production filesystems through one interface.

The SDK exposes application metadata through `/metadata.json`. Page routes registered with the SDK router are collected into that metadata, so the embedded web runtime can discover and render the application's pages. Page handlers return XML content, while normal FastAPI routes can still provide API behavior for the application.

| Area            | Testing                  | Development               | Production                               |
| --------------- | ------------------------ | ------------------------- | ---------------------------------------- |
| Runtime         | Test runtime             | SDK runtime               | Platform runtime                         |
| User management | Fixtures, auth overrides | Seeded local users        | OIDC users                               |
| Access model    | Isolated permissions     | Local role simulation     | Organization and application memberships |
| Database        | In-memory SQLite         | SQLite                    | PostgreSQL database and schemas          |
| File storage    | In-memory `fsspec`       | Local `fsspec` filesystem | S3-compatible buckets                    |
| Web bundle      | Test runtime             | SDK bundle                | API bundle and app rendering             |
| Environment     | Test settings            | Local settings            | Runtime secrets                          |
| Build command   | `longlink tests`         | `longlink dev`            | `longlink build`                         |
| Deployment      | None                     | Local process             | Platform deployment                      |
| Operations      | Test assertions          | Local debugging           | Create, verify, delete, logs, status     |

Keep both web build modes working. API mode builds the authenticated control-plane and documentation bundle into `api/src/.static/web`. SDK mode builds the embedded local runtime bundle into `sdk/longlink/.static/web`. Do not remove Vite mode checks, output directories, SDK/API-specific behavior, or the shadcn/ui primitives in `web/src/components/ui/` unless the product model explicitly changes.

## Contributing model

- Keep changes small and clear
- Reduce complexity and remove dead code
- Enforce project conventions, normalize naming, improve readability
- Include two blank lines between function definitions
- Do not add new helper functions unless they are explicitly needed.
- Python functions must have docstrings, and non-trivial logic blocks must have preceding `# ...` comments.
- JavaScript functions must have JSDoc comments, and non-trivial logic blocks must have preceding `// ...` comments.
- Always check at the end of the implementation, for potential simplifications.
- Write simple, well designed and maintainable code. No strange hacks, use proper solutions
- Pydantic models must group fields by commented sections, and fields inside each section must be ordered from shortest name to longest name.
- Use long domain names in code and filenames instead of abbreviations.
- Keep related model module names plural and consistent across the API and database layers.

- Project is in MVP mode: prefer the current model over backward compatibility, remove obsolete code when replacing old flows

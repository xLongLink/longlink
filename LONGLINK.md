# LongLink Story And Brand

This is a working document for LongLink positioning, story, and brand language. Each concept should have one home here so README, website, and product copy can reuse the same source of truth.

## Core Position

LongLink is an open-source platform for building and running structured internal business applications.

It combines two parts:

- A local-first SDK for building applications.
- A control plane for running those applications in a consistent, governed environment.

Primary message:

> Build internal apps, not platform glue.

Short description:

> LongLink gives technical teams a structured way to build custom internal software while the platform handles the shared foundation around each application.

## The Story

Every organization eventually needs software that is too specific for generic tools. Teams start with scripts, spreadsheets, dashboards, and small internal apps, but those tools become expensive when each one has to solve the same foundation problems again.

LongLink starts from a simple assumption: internal applications should be specific in their business logic, not in their platform plumbing.

The platform should provide the common foundation once. Developers should focus on the application-specific logic that makes each workflow valuable.

## Shared Foundation

The shared foundation is the repeated platform work that most internal applications need:

- Authentication
- Users
- Organizations
- Permissions
- Databases
- Storage
- Deployment
- Routing
- Logs
- Operations
- Application shell

LongLink centralizes this foundation so teams do not rebuild it differently for every application.

## Application Model

LongLink applications are real backend services. Developers can use normal code, libraries, integrations, and backend patterns to support very specific business needs.

Application code owns:

- Data models
- API behavior
- Validation rules
- Actions
- Workflows
- Integrations
- Declarative XML pages

The SDK supports local scaffolding, development, testing, migrations, metadata, storage helpers, XML page discovery, and image packaging.

## Powered By Python

Python is the right foundation for LongLink because internal business applications often need custom rules, integrations, automation, data processing, and operational logic. These needs rarely fit inside a narrow configuration system, but they fit naturally in normal application code.

LongLink uses the Python ecosystem instead of replacing it:

- FastAPI for application runtimes and API routes.
- SQLAlchemy and SQLModel for relational data models and database access.
- Alembic for database migrations.
- Pydantic for typed configuration, schemas, and validation.
- fsspec for portable storage across local files, memory-backed tests, and S3-compatible production storage.
- pytest for application and SDK tests.
- uvicorn for local and production ASGI serving.

This keeps LongLink extensible. Teams can add custom libraries, connect to external systems, write business-specific logic, and use existing Python skills while still relying on the shared platform for access, infrastructure, deployment, and operations.

## Value

LongLink should help teams create better internal products at a lower long-term cost.

- Lower cost: the shared foundation is implemented once instead of rebuilt for every application.
- Better maintainability: business processes are modeled explicitly instead of hidden across scattered tools.
- Strong extensibility: applications stay open to custom logic, libraries, and integrations.
- Consistent user experience: applications run inside the same platform shell.
- Portable delivery: the same application model works across testing, local development, and production.
- AI-ready structure: generated code has a stable product model to fit into instead of becoming fragmented software.

## Audience

LongLink is for developers and technical teams responsible for custom internal software.

Common use cases include internal tools, approval flows, operations systems, admin panels, CRM-like applications, data management interfaces, workflow systems, and tenant-aware business applications.

Business users benefit from guided workflows that are reliable, traceable, and easier to change when requirements evolve.

## Boundaries

LongLink is not:

- No-code.
- A generic dashboard builder.
- A replacement for developers.
- A hosted spreadsheet.
- A single-purpose workflow tool.

## Brand Voice

LongLink should feel practical, technical, reliable, clear, structured, calm, and long-term.

Avoid hype, vague productivity claims, enterprise jargon, no-code language, overpromising automation, and sounding like another dashboard builder.

## Homepage Structure

The homepage should make LongLink understandable in seconds for developers, business buyers, and investors. It should explain what LongLink is, why it matters, why it can reduce cost, and why it stays flexible for very specific business needs.

### Hero

Hero:

> Build real apps
> not glued tools.

Subhero:

> Your workflows become software.
> Business logic stays in code.
> LongLink runs the platform.
> Maintainable by design.

Presentation:

> The hero should form a downward arrow through text width: a wider first headline line, a shorter second headline line, and compact description lines. Do not use a custom arrow graphic or clipped shape.

### Section Cards

Use one compact card grid. Six cards are enough; each card can carry multiple related concepts instead of splitting every feature into its own card.

- Real applications: business logic, structured UI, workflow states.
- Shared foundation: authentication, organizations, permissions, application shell.
- Powered by Python: FastAPI, SQLAlchemy, Pydantic, Alembic.
- Local to production: scaffold, test, build, deploy.
- Lower long-term cost: runtime, storage, databases, operations.
- Built to evolve: specific logic, maintenance, extensions.

### Post-Card CTA

The section after the cards should be centered and should not be rendered as a card. LongLink is open source, so the first action should be to explore and start building. Pricing and contact should be available for teams evaluating managed or production use.

Heading:

> Start building on LongLink

Description:

> Explore the platform, build your first application, or talk to us about running LongLink for your team.

Primary action:

> Get started

Secondary actions:

- Star on GitHub
- See pricing
- Contact us

## README Direction

The README should quickly answer:

- What is LongLink?
- Who is it for?
- What problem does it solve?
- What does the developer build?
- What does the platform provide?
- Why should someone star or follow the repository?

Suggested README flow:

1. Use the core position as the opening.
2. Explain the story in one short paragraph.
3. Summarize the shared foundation and application model.
4. State the value clearly: lower cost, better maintainability, and extensibility.
5. End the introduction with a direct GitHub-specific call to star the repository.

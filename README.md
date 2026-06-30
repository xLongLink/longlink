<div align="center">

# LongLink

A platform for workflows, data, and validation

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://docs.longlink.dev) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br />
<br />

## Introduction

LongLink is a platform for building structured internal business applications.

It is designed for organizations whose workflows are too specific for generic software, but where building every application from scratch would create unnecessary complexity. LongLink provides a common foundation for authentication, permissions, organization management, deployment, data handling, validation, actions, and workflows.

Applications are built with a Python SDK using technologies such as FastAPI and SQLAlchemy. Each application follows a clear structure composed of a data layer, an API layer, and a declarative UI layer. Developers define the business logic, validation rules, permissions, workflows, and actions, while LongLink renders the application inside a consistent platform interface.

LongLink does not replace technical teams. It gives them a structured way to build and maintain business applications without repeatedly rebuilding the same infrastructure. Business users interact with guided workflows that are organized, traceable, and reliable.

By exposing users to defined entities, fields, actions, permissions, and workflow states, LongLink reduces the gap between business requirements and technical implementation. Requirements become clearer, processes become easier to model, and applications evolve on a more stable foundation.

Modern AI tools make code generation faster, but speed alone does not create maintainable software. Without structure, generated applications can become fragmented and difficult to evolve.

LongLink provides that structure. The platform defines the shared infrastructure. The SDK defines the development model. Technical teams define the business logic. Users interact with the final workflow through a consistent native interface.

The result is a faster, clearer, and more maintainable way to build internal applications.

<br />

## Benefits

- Faster delivery: teams build on a shared platform instead of starting from a blank stack.
- Clearer requirements: business processes are modeled as data, validation, permissions, actions, and workflow states.
- Consistent user experience: applications share the same web runtime, routing, authentication, and interface patterns.
- Lower maintenance cost: common concerns such as auth, storage, deployment, and operations are handled once by the platform.
- Better governance: users, organizations, memberships, infrastructure, and application status are managed centrally.
- Local-first development: developers can build and test applications locally before adding them to the platform.
- Portable applications: the same application model works across testing, development, and production environments.
- Scalable operations: the control plane provisions compute, database, and storage resources through adapters.
- Safer evolution: applications can change with the business process while keeping a stable runtime and deployment model.

## Testing

Run the full project verification from the repository root:

```bash
make tests
```

Run narrower checks while working in one area:

```bash
cd api && ENVIRONMENT=testing uv run pytest tests
cd sdk && uv run pytest tests
bun test tests --cwd web
bun run --cwd web typecheck
```

## Features

- User managements
- Permissions
-

<br />
<br />

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.ch)

</div>

---

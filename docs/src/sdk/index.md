# Application SDK

LongLink SDK is wrapper around proven Python ecosystem tools.
Goal is to keep development flow as close as possible to native FastAPI stack, while adding platform integration and normalized interfaces.

SDK centers around these building blocks:

- FastAPI for REST API design and runtime behavior
- SQLModel for relational data models built on SQLAlchemy
- Alembic for schema migration lifecycle
- Pydantic for request and response models, plus Pydantic Settings for configuration
- S3-compatible object storage exposed through a normalization layer aligned with the S3 specification

This design means you can use standard FastAPI ecosystem patterns first, then rely on SDK wrappers to reduce boilerplate for platform concerns.

## What SDK Adds

SDK does not replace ecosystem tools.
SDK wraps and connects tools so you can focus on business logic.

SDK provides:

- app bootstrap wrapper around FastAPI
- environment and settings wiring with typed validation
- normalized database and migration conventions
- normalized object storage access for S3-compatible providers
- integration points with LongLink control plane lifecycle

## Application Types

There are three main types of applications:

- **Systems**
  Long-lived applications supporting core organizational functions such as accounting, content management, marketing, or compliance

- **Workspaces**
  Applications scoped to a specific client or external entity, providing isolated environments for managing related data and operations

- **Workflows**
  Applications that execute a defined process with a clear lifecycle, enforcing required steps, validations, and completion criteria

## Getting Started

Install the SDK:

```bash
pip install longlink
```

Initialize a new application:

```bash
longlink init
```

Run the development server:

```bash
longlink dev
```

## Application Construction

The SDK creates applications through an `App` wrapper that contains a FastAPI instance and validated settings.
You can extend settings with project-specific values and pass the resulting object to `App`.

See complete examples in:

- [Environments](/sdk/environments/)
- [Endpoints](/sdk/endpoints/)
- [Database](/sdk/database/)
- [Storage](/sdk/storage/)

## Configuration

To configure runtime variables for database and storage, see:

- [Environments](/sdk/environments/)

## API Endpoints

To define endpoint handlers on top of wrapped FastAPI app, see:

- [Endpoints](/sdk/endpoints/)

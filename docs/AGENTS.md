# Documentation Style Guide

LongLink documentation explains how to build, deploy, and operate applications on a unified platform composed of a control plane and an applications SDK.

Users may come from different technical backgrounds, industries, and regions. Documentation must be clear, precise, and easy to translate. The goal is to make platform concepts understandable and usable without requiring deep infrastructure expertise.

LongLink provides a standardized system for identity, permissions, storage, execution, and observability. Documentation must reflect these goals: clarity, consistency, and technical accuracy.

## Custom Containers

Supported patterns:

```md
::: info
Reference information.
:::

::: tip
Helpful guidance.
:::

::: warning
Important caveat.
:::

::: danger
Breaking or risky behavior.
:::

::: details
Optional expanded content.
:::
```

## Page Content

Each resource page should usually include:

- what the resource is for
- the available methods
- the request models
- the returned models
- short usage examples when useful

# From “Zero to Running Applications”

Documentation should guide the reader from first contact with the platform to running real applications.

A reader should be able to:

1. Understand what LongLink provides
2. Understand the role of the control plane
3. Understand how applications are structured with the SDK
4. Run an application end to end
5. Extend and manage applications

Tutorials should start with minimal assumptions. Advanced guides can build on earlier concepts.

# Write for More Than Just Backend Engineers

LongLink users include:

- backend developers
- frontend developers
- platform engineers
- data engineers
- technical teams building internal tools

Not every reader is familiar with distributed systems, container orchestration, or infrastructure design.

Avoid unnecessary jargon. When specialized terms are required, explain them briefly.

Example

Bad
“Provision isolated execution environments with integrated observability pipelines.”

Good
“Each application runs in an isolated environment. The platform also tracks logs and metrics automatically.”

# Professional and Direct Tone

The tone should be professional, clear, and neutral.

Avoid marketing language or overly casual phrasing. Documentation should read like guidance from an experienced engineer.

Example

Bad
“Build powerful apps instantly with our cutting-edge platform!”

Good
“Build applications using the SDK and run them on the LongLink platform.”

# “You”, “LongLink”, and External Systems

Use explicit references for actions and responsibilities.

### “You”

“You” refers to the reader performing an action.

Example
“You can define an API endpoint using FastAPI.”

### “LongLink”

Use “LongLink” when referring to the platform or system behavior.

Example
“LongLink provisions storage and a database for each application.”

Avoid ambiguous “we”.

### External systems

Name external tools explicitly before using pronouns.

Example

Bad
“It handles database migrations.”

Good
“Alembic handles database migrations.”

# Avoid Ambiguous Pronouns

Pronouns reduce clarity and complicate translation.

Prefer explicit nouns such as:

- the user
- the application
- the control plane
- the SDK
- the system
- the API

Example

Bad
“When it starts, it connects to it.”

Good
“When the application starts, the application connects to the database.”

# Prefer Infinitive Forms Over Gerunds

Use verb forms with “to”.

Example

Bad
“Managing application state is handled by the control plane.”

Good
“The control plane manages application state.”

# Keep Sentences Short

Short sentences improve clarity and translation.

Example

Bad
“LongLink provides a unified platform that integrates identity, storage, execution, and observability into a single system that simplifies application development.”

Good
“LongLink provides a unified platform.
The platform integrates identity, storage, execution, and observability.
This reduces the need to build these systems manually.”

# Explain Architecture Clearly

LongLink has a structured architecture. Documentation must reflect it clearly.

## Control Plane

The control plane:

- manages identity and permissions
- provisions infrastructure
- enforces isolation
- manages application lifecycle
- acts as a secure proxy

Example

Bad
“The backend handles orchestration.”

Good
“The control plane provisions resources, enforces permissions, and manages application lifecycle.”

## Applications SDK

Applications are built using:

- Python backend
- FastAPI for APIs
- SQLAlchemy and Alembic for database
- fsspec for storage
- XML-based UI definitions

Example

Bad
“The app defines UI and backend logic.”

Good
“The application defines a REST API using FastAPI.
The UI is described using XML files.”

## Web Layer

The web layer:

- renders XML-defined UI
- communicates with APIs
- is shared between SDK and control plane

# Use Clear and Consistent Terminology

Preferred terms for LongLink documentation:

| Preferred Term       | Avoid                    |
| -------------------- | ------------------------ |
| application          | service / microservice   |
| control plane        | backend system           |
| SDK                  | framework                |
| API                  | endpoint layer           |
| UI definition        | frontend config          |
| XML page             | template                 |
| isolated environment | container (when unclear) |

Use terms consistently across all documents.

# Describe System Behavior Precisely

Applications run in isolated environments managed by the control plane.

Example

Bad
“The app runs in a container.”

Good
“The application runs in an isolated environment managed by the control plane.”

# Describe Responsibilities Clearly

LongLink separates responsibilities between components.

Example

Bad
“The system handles everything automatically.”

Good
“The control plane provisions resources and enforces permissions.
The application defines business logic using the SDK.”

# Step-by-Step Instructions

Tutorials must be explicit and sequential.

Example workflow:

1. Create an application
2. Define the database models
3. Run migrations
4. Implement API endpoints
5. Define UI pages using XML
6. Deploy the application
7. Access the application through the web interface

Do not skip steps.

Example

Bad
“Create an app and run it.”

Good

1. Create a new application using the SDK.
2. Define the data model using SQLAlchemy.
3. Run database migrations using Alembic.
4. Start the FastAPI server.

# Avoid Marketing Language

Documentation must describe functionality, not promote it.

Example

Bad
“LongLink revolutionizes application development!”

Good
“LongLink provides a unified platform for building and running applications.”

# LongLink

LongLink is a unified operational control plane for business systems. It establishes a standardized layer for identity, permissions, data, and governance, ensuring consistency and compliance across an organization’s digital environment. On top of this foundation, it provides an application runtime where operational tools execute using shared infrastructure rather than isolated stacks. By separating control from execution, LongLink eliminates fragmentation, enforces policy centrally, and enables businesses to build and run internal applications within a coherent, governed system.

# Control Plane - API Folder

The LongLink control plane is the centralized governance layer that defines and enforces how all systems within an organization operate. It standardizes identity, access control, data policies, storage rules, audit logging, and execution constraints into a single, consistent framework. Rather than each application implementing its own security and infrastructure logic, the control plane provides these capabilities as shared primitives, applied uniformly across all workloads. This ensures that every operation—whether data access, workflow execution, or deployment—is governed by the same policies, making consistency, compliance, and observability inherent to the system rather than dependent on individual applications.

## Authentication

- Using `fastapi` and `authlib`.

## Permissions

[TODO: How to manage permissions]

- Role-based access control (RBAC) system with hierarchical roles and fine-grained permissions.

## Application Lifecycle Management

[TODO: How to manage the applications]

## SDK Runtime services

## Workflow Engine

<br />

# LongLink Python Package - SDK Folder

- App = deployable, isolated, governed execution unit
- Created with python

[TODO: SDK Overview]

## Application Definition

- Type: tool, space, process
- Metadata: name, description, icon, etc.

## Database Access and Migrations

- A dedicated database (PostgreSQL, MySQL, Oracle, Microsoft SQL Server, ..) for each app
- ORM schema using `sqlalchemy`, with a `longlink` wrapper
- Migrations are done with `pydantic` using the cli command `longlink db migrate`

## Storage Access

- A dedicated filesystem space (S3, GCS, Azure Blob, local FS)
- Normalized access using `fsspec` with a `longlink` wrapper

## UI Components

- Server-driven UI model with python classes.

## API Endpoints

- Defined as python functions with decorators to specify the endpoint path, method, and required permissions.
- Functions can be called directly from the UI components.
- This allows programmatic access from day zero.
- Automatic conversion of endpoint to SDK (using openapi spec or similar).
- Automatic conversion of endpoint to MCP server.

<br />

# User Interface - WEB Folder

[TODO: UI Overview]

## Organization View

### Overview

### Tools

- Organization control surface, everything that helps the organization operate and run its business.
- Examples: CRM Tool (Customer Management), Invoicing & Accounting Tool, HR & Employee Management Tool, Compliance & Audit Tool, Inventory Management Tool

### Spaces

- Domain container that aggregates and manages context

### Processes

- Independent, stateful unit of work

### People

### Settings

## Applications View

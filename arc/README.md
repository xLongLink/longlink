# OVERVIEW [AI Draft]

## Purpose

LongLink is a multi-tenant operational runtime that provides organizations with a governed, isolated digital environment in which business applications execute under unified infrastructure control.

It standardizes foundational concerns—identity, access control, storage, compute, audit logging, workflow primitives, and UI execution—into a centralized control plane. Applications operate strictly within this governed environment and are not permitted to redefine infrastructure or security policies independently.

LongLink is not a SaaS product. It is an operational control layer for business software.

## System Model

Each organization is provisioned at:

```
organization.longlink.com
```

An organization runtime consists of:

- LongLink Control Plane
- Centralized Authentication & RBAC
- Dedicated PostgreSQL cluster (per app database isolation)
- S3-compatible object storage namespace
- Container runtime for applications
- Audit logging infrastructure
- Backup orchestration
- Workflow engine
- Server-driven UI rendering model

Organizations are logically isolated from one another. Applications are isolated from each other within an organization.

---

## Architectural Invariants

The following are non-negotiable system guarantees:

1. **Control Plane Authority**
    - All execution is mediated by the control plane.
    - No application bypasses identity, RBAC, or policy enforcement.

2. **Centralized Identity**
    - Applications do not manage authentication or sessions.
    - Identity is issued and enforced by the platform.

3. **Application Isolation**
    - Each app has:
        - A dedicated database
        - A dedicated object storage namespace
        - A dedicated container
        - Explicit CPU and memory limits

    - Cross-app data access is forbidden unless explicitly mediated.

4. **Deterministic UI Execution**
    - All page state is computed server-side.
    - No client-side business logic.
    - Each user action triggers full backend recomputation.

5. **Infrastructure Separation**
    - Platform owns infrastructure concerns.
    - Applications implement domain logic only.

## Execution Flow

### Authentication Flow

```
User → Identity Provider → LongLink → Application
```

1. User authenticates via external IdP (OIDC/SAML).
2. LongLink validates identity.
3. LongLink issues a scoped identity context.
4. Application executes with platform-injected identity.

Applications trust the platform-issued identity context and never create sessions independently.

---

### Request Lifecycle

1. User performs action in UI.
2. Frontend sends request to control plane.
3. Control plane validates:
    - Authentication
    - RBAC
    - Organizational scope

4. Request is routed to the target application container.
5. Application recomputes full page state.
6. JSON page definition is returned.
7. Frontend renders deterministically.

No client-side state transitions occur outside platform authority.

## Multi-Tenancy Model

Isolation operates at two levels:

### Organization-Level Isolation

- Subdomain-based separation
- Independent runtime boundaries
- No cross-org data access

### Application-Level Isolation

- Dedicated database per app
- Dedicated object storage namespace per app
- Dedicated container per app
- Resource quotas enforced

Isolation is enforced technically, not by convention.

## Control Plane Responsibilities

The control plane is responsible for:

- Identity federation
- Session management
- Role-based access control
- Application lifecycle management
- Container orchestration
- Storage governance
- Backup orchestration
- Audit logging
- Workflow execution
- Page rendering API
- Policy enforcement

Applications are never granted authority over these responsibilities.

## Application Model

Applications:

- Are Python-based
- Are containerized
- Are deployed exclusively via the control plane
- Define pages, elements, and actions
- Return structured JSON page state
- Do not manage:
    - Authentication
    - RBAC
    - Infrastructure
    - Storage policies
    - Execution environment

Applications operate within constraints defined by the platform.

## Server-Driven UI Model

The UI is defined entirely by backend-generated JSON.

Properties:

- Deterministic rendering
- Centralized permission enforcement
- Full state recomputation per interaction
- Simplified frontend complexity
- Strong auditability

This model prioritizes predictability and governance over client-side dynamism.

## Security Model

Security is enforced at the control plane layer:

- Identity abstraction from applications
- Strict RBAC enforcement
- No cross-app direct communication
- No unmanaged secrets
- Resource quotas per container
- Audit logging of all actions

Compromise of a single application container must not grant access to:

- Other applications
- Other organization data
- Control plane internals

## Design Goals

LongLink optimizes for:

- Infrastructure standardization
- Deterministic execution
- Strong isolation
- Operational simplicity
- Governance consistency
- Reduced duplication across applications
- Suitability for automation and AI-assisted development

It does not optimize for:

- Consumer-grade interactive UI complexity
- Arbitrary plugin execution
- Infrastructure customization at app level

## Summary

LongLink centralizes operational infrastructure once and enforces it uniformly across all applications within an organization.

By separating infrastructure governance from business logic, it prevents fragmentation, reduces duplication, and creates a cohesive operational environment where applications remain isolated, deterministic, and policy-bound.

This document defines the conceptual boundary of the system. All other architectural documents refine and formalize the components described here.

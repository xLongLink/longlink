# LongLink

An Operational Infrastructure for Businesses

LongLink is a multi-tenant operational runtime that provides organizations with a structured and isolated digital environment where business applications execute under unified governance. Each organization is provisioned at a dedicated subdomain (organization.longlink.com) and operates within its own isolated operational instance.

This instance includes the LongLink control plane, a dedicated PostgreSQL database cluster, S3-compatible object storage, a container runtime for applications, backup and audit logging infrastructure, and centralized authentication with RBAC. LongLink functions as a middleware and policy enforcement layer between users and business applications, ensuring that identity, access control, storage governance, and execution policies are consistently enforced across the entire operational environment.

# The Problem

Small and medium-sized businesses operate in fragmented digital environments where spreadsheets, documents, email threads, and disconnected SaaS tools coexist without true integration. While SaaS platforms were intended to solve this fragmentation, they often introduce vendor lock-in, duplicated authentication systems, inconsistent user experiences, data silos, and rising subscription costs. Instead of simplification, SMEs accumulate isolated systems that rarely communicate effectively.

For companies without dedicated IT teams, this results in fragile infrastructures built on workarounds and incremental fixes. Yet most business needs—CRM, accounting, document management, project tracking, and compliance—are structurally straightforward, typically requiring only a UI layer, business logic, a database, and file storage. Despite this simplicity, vendors repeatedly rebuild the same infrastructure within closed ecosystems, reinforcing fragmentation rather than eliminating it.

LongLink functions as a business control plane that standardizes core infrastructure across an organization. It centralizes identity, permissions, storage, compute, audit logging, workflow primitives, and application lifecycle management into a unified layer. Instead of each application redefining these components independently, they operate on shared, consistent infrastructure.

Conceptually, it draws inspiration from GitHub’s organizational model—structured organizations, isolated environments, controlled access, and managed deployments—but applies this architecture to operational business software rather than source code. The result is a cohesive control layer for business systems, not just development workflows.

# Architecture Overview

## 1. Organization Runtime

Each organization operates within an isolated runtime environment governed by the LongLink Control Plane. This core layer is responsible for authentication, role-based access control, session management, audit logging, backup orchestration, application deployment and lifecycle management, the page rendering API, and the workflow engine. It acts as the authoritative layer for all governance, security, and operational policies. No application bypasses this layer; all execution is mediated through it.

## 2. Application Isolation

Every installed application runs in strict isolation. Each receives a dedicated PostgreSQL database, a dedicated S3 storage namespace (bucket or prefix), and a dedicated container instance with explicitly defined CPU and memory limits. Applications are Python-based, containerized, and deployed exclusively through the control plane.

They are not permitted to implement authentication, define storage policies, or manage permissions independently. All identity, access control, and infrastructure governance are centralized within LongLink. This guarantees hard isolation between apps while maintaining unified policy enforcement.

## 3. Server-Driven UI Model

LongLink adopts a server-driven UI architecture. Applications define pages, elements, and actions, and the backend returns structured JSON describing the full page state. The frontend consumes this JSON, maps element types to predefined UI components, and renders the interface deterministically.

User interactions follow a strict execution loop: a user action triggers a backend endpoint, the page state is recomputed server-side, new JSON is generated, and the page is fully re-rendered. There is no client-side business logic.

This model enforces deterministic state transitions, centralized permission checks, simplified security boundaries, and a development paradigm well-suited for automation and AI-assisted tooling.

# Authentication & Identity

Applications do not manage authentication directly. Instead, LongLink integrates with external identity providers such as Google OAuth, Microsoft Entra ID, Okta, and any standards-compliant OIDC or SAML provider. Identity federation is handled entirely at the platform level, abstracting authentication complexity away from individual applications.

The authentication flow follows a strict chain: User → Identity Provider → LongLink → Application. After successful authentication, LongLink issues a scoped identity context to the target application. Applications trust the platform-issued identity tokens and never create, store, or manage sessions themselves. Identity, session control, and access enforcement remain centralized within the control plane.

# Platform Philosophy

LongLink enforces a strict separation between operational infrastructure and business logic applications. The platform owns and standardizes all foundational concerns, including identity, permissions, compute orchestration, storage governance, audit logging, workflow primitives, and the UI rendering model. These capabilities are implemented once at the control-plane level and uniformly applied across the organization.

Applications, by contrast, focus exclusively on domain logic. They do not manage infrastructure, security policies, or execution environments. Instead, they operate within the constraints and guarantees provided by the platform, allowing development to concentrate purely on business functionality while infrastructure remains centralized and consistent.

## Development

Run the frontend in development mode:

```bash
bun --cwd=web install
bun --cwd=web dev
```

Run the backend in development mode:

```bash
python -m venv .venv
source .venv/bin/activate # On Windows use `.venv\Scripts\activate`
pip install -e './api[dev]'
pip install -e sdk


```

Finally run the api and a sample app:

```bash
python api/main.py
python sdk/sample/main.py
```

# LongLink Secrets Layout

This document defines the secrets and environment-variable model for LongLink.

## Core Principles

1. **Control Plane owns all secrets**
   - Apps never define, store, or fetch secrets from external secret managers.
   - The Control Plane handles encryption, versioning, runtime injection, and auditing.

2. **Strict scope isolation**
   - Secrets are scoped by organization and application.
   - No app can read another app’s secrets.

3. **Immutable runtime behavior**
   - Secrets are injected at container start.
   - Running containers do not receive live secret mutations.
   - Rotation happens through controlled restarts.

## Storage Layout

```text
Encrypted Secret Store
└── org_id
    ├── global/
    │   └── <SECRET_NAME> -> encrypted value + metadata + versions
    └── apps/
        └── <app_id>/
            └── <SECRET_NAME> -> encrypted value + metadata + versions
```

## Secret Scopes

| Scope | Example | Visibility |
| --- | --- | --- |
| Organization-level | `SMTP_PASSWORD` | Apps explicitly permitted by policy |
| Application-level | `STRIPE_API_KEY` | Only the target app |

## Environment Variable Categories

### 1) Platform System Variables (read-only)

Injected and reserved by platform:

```env
LONG_LINK_ORG_ID
LONG_LINK_APP_ID
LONG_LINK_USER_CONTEXT_ENDPOINT
LONG_LINK_AUDIT_ENDPOINT
```

### 2) Infrastructure Variables (platform-managed)

Injected by platform infrastructure:

```env
DATABASE_URL
S3_BUCKET
S3_ENDPOINT
```

### 3) User-Defined Secrets (control-plane managed)

Defined by admins in the control plane:

```env
STRIPE_API_KEY
SMTP_PASSWORD
THIRD_PARTY_WEBHOOK_SECRET
```

## Lifecycle

### 1. Create

- Admin submits secret via Control Plane API/UI.
- Control Plane encrypts, stores, and versions the secret.
- Audit log entry is created.

### 2. Deploy-time Injection

At app container startup, the Control Plane:

1. Resolves allowed org + app secrets.
2. Decrypts in-memory.
3. Injects as process environment variables.
4. Starts container.
5. Discards decrypted in-memory copy.

### 3. Rotation

1. Admin updates secret value.
2. New secret version is created.
3. Old version is deprecated.
4. Platform performs rolling restart.
5. New containers receive the new value.

## Application Contract

### Allowed

```python
import os
api_key = os.environ["STRIPE_API_KEY"]
```

### Forbidden

- Fetching secrets directly from AWS/GCP/Vault from app code.
- Shipping `.env` files in app deployments.
- Persisting secret copies in app databases or object storage.
- Runtime mutation of secret values inside running containers.
- Exposing secrets to frontend payloads.

## Security Guarantees

- Tenant and app isolation boundaries are enforced.
- Secret governance and audit are centralized.
- Runtime behavior is deterministic.
- Blast radius is constrained by org/app scope.

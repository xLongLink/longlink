---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/api/self-hosted.md
---

# Self-hosted Control Plane

Use self-hosted mode when you run the LongLink control plane in your own infrastructure.

## Infrastructure

Provide these systems before you deploy LongLink:

- A Kubernetes cluster for the control plane and application workloads
- A PostgreSQL server for database provisioning
- S3-compatible object storage for files and artifacts

## Required Environment Variables

Configure the API container with session and control-plane settings. Database, storage, and compute backends are
registered through the API.

### Session

- `SESSION_KEY`
- `DATABASE_URL`
- `URL`

### Database

Register database backends after startup. Their connection details live in the control plane database, not in API env
vars.

### Storage

Register storage backends after startup. The API reads bucket connection details from the storage registry.

### Compute

Register compute backends after startup. The API uses the registered kubeconfig and ingress settings when provisioning
apps.

## Deployment Model

Deploy the control plane container and application containers in the same Kubernetes cluster.

This keeps control-plane traffic inside the cluster boundary and avoids public ingress for application routing.

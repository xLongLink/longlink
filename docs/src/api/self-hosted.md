# Self-hosted Control Plane

Use self-hosted mode when you run the LongLink control plane in your own infrastructure.

## Infrastructure

Provide these systems before you deploy LongLink:

- A Kubernetes cluster for the control plane and application workloads
- A PostgreSQL server for database provisioning
- S3-compatible object storage for files and artifacts

## Required Environment Variables

Configure the API container with these variables:

### Session

- `SESSION_KEY`

### Compute

- `COMPUTE_URL`
- `COMPUTE_KUBE_CONFIG_PATH`


### Database

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`

### Optional

- `DATABASE_SSLMODE`

Use database administrator credentials for `ENV_PROVISION_DATABASE_USERNAME` and `ENV_PROVISION_DATABASE_PASSWORD`.
The account must be able to create databases on the `postgres` maintenance database.

### Storage

- `STORAGE_PROTOCOL`
- `STORAGE_ENDPOINT_URL`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`

### Optional

## Deployment Model

Deploy the control plane container and application containers in the same Kubernetes cluster.

This keeps control-plane traffic inside the cluster boundary and avoids public ingress for application routing.

# Self Hosted

Use this mode when you run LongLink control plane in your infrastructure.

## Required infrastructure

You must provide these external systems:

- **Kubernetes cluster** for compute and application runtime
- **PostgreSQL server** for database provisioning
- **S3-compatible object storage** for files and artifacts

## Required environment variables

Configure the API container with these provisioning variables.

### Compute (Kubernetes)

- `ENV_PROVISION_COMPUTE_API_SERVER_URL`
- `ENV_PROVISION_COMPUTE_ADMIN_USERNAME`
- `ENV_PROVISION_COMPUTE_ADMIN_PASSWORD`
- `ENV_PROVISION_COMPUTE_DEFAULT_NAMESPACE`
- `ENV_PROVISION_COMPUTE_VERIFY_SSL`

### Database (PostgreSQL)

- `ENV_PROVISION_DATABASE_HOST`
- `ENV_PROVISION_DATABASE_PORT`
- `ENV_PROVISION_DATABASE_USERNAME`
- `ENV_PROVISION_DATABASE_PASSWORD`
- `ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE`
- `ENV_PROVISION_DATABASE_SSLMODE` (optional)

Use **database administrator credentials** for `ENV_PROVISION_DATABASE_USERNAME` and `ENV_PROVISION_DATABASE_PASSWORD`.
The account must have permission to create databases on the maintenance database.

### Storage (S3-compatible)

- `ENV_PROVISION_STORAGE_ENDPOINT_URL`
- `ENV_PROVISION_STORAGE_ACCESS_KEY_ID`
- `ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY`
- `ENV_PROVISION_STORAGE_REGION_NAME` (optional)

This model matches Docker Compose development setup, but uses production infrastructure.

## Control plane deployment model

LongLink API is distributed as container image.

Deploy API container into your Kubernetes cluster.

Deploy application containers into same Kubernetes cluster.

With this topology:

- control plane reaches applications through internal cluster networking
- control plane proxies traffic without public internet path
- service discovery and network policy stay inside cluster boundary

## Why same-cluster deployment

Keeping control plane and applications in one cluster simplifies routing and security:

1. Control plane schedules and tracks application workloads in cluster.
2. Internal services communicate with private DNS and cluster IPs.
3. Control-plane-to-application traffic avoids external ingress and egress.
4. Governance stays centralized while runtime stays in your infrastructure.

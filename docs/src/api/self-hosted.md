# Self Hosted

Use self-hosted mode when you run the LongLink control plane in your own infrastructure.

## Required infrastructure

You must provide:

- a Kubernetes cluster for control plane and application workloads
- a PostgreSQL server for database provisioning
- S3-compatible object storage for files and artifacts

## Required environment variables

Configure the API container with these variables:

### Compute

- `ENV_PROVISION_COMPUTE_URL`
- `ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH`
- `ENV_PROVISION_COMPUTE_NAMESPACE`

### Database

- `ENV_PROVISION_DATABASE_HOST`
- `ENV_PROVISION_DATABASE_PORT`
- `ENV_PROVISION_DATABASE_USERNAME`
- `ENV_PROVISION_DATABASE_PASSWORD`
- `ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE`
- `ENV_PROVISION_DATABASE_SSLMODE` (optional)

Use database administrator credentials for `ENV_PROVISION_DATABASE_USERNAME` and `ENV_PROVISION_DATABASE_PASSWORD`.
The account must be able to create databases on the maintenance database.

### Storage

- `ENV_PROVISION_STORAGE_ENDPOINT_URL`
- `ENV_PROVISION_STORAGE_ACCESS_KEY_ID`
- `ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY`
- `ENV_PROVISION_STORAGE_REGION_NAME` (optional)

## Deployment model

Deploy the control plane container and application containers into the same Kubernetes cluster.

This keeps control-plane traffic inside the cluster boundary and avoids public ingress for application routing.

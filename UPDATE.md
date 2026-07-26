# 

# Global

```text
Git release with `VERSION`
    |
    v
Build image with `VERSION`
    |
    v
Production -> Migrate Platform database -> Roll out API
    |
    v
Run pending migrations for Database, Storage, Kubernetes
    |
    v
All resources aligned with `VERSION`
```

```text
New resource -> Install latest state ---------------------> Aligned
New release  -> Run each pending migration once -> Verify -> Aligned
```

Migrations are the one-off work. Each release declares ordered migration IDs for Compute, Storage, and Database resources. A migration is recorded as complete once for each applicable resource, but its implementation must be safe to retry after a partial failure. New resources are installed directly at the latest state and do not need to replay migrations for older versions.

"Cannot change in place" does not mean the resource can never change. It means LongLink must create a compatible replacement, migrate clients, verify the result, and remove the old resource later, or use a maintenance window.

# Compute

The datacenter provider manages the Kubernetes cluster. LongLink connects through a kubeconfig and manages these resources:

| Resource | Repeated reconciliation | One-off migration when needed | Cannot change directly while clients run |
| --- | --- | --- | --- |
| Gateway | Keep the Envoy image, configuration, routes, probes, and resources at the desired revision | Replace an immutable resource, move configuration, or introduce a new secret format | Replace the stable Service address or TLS trust without a compatible overlap period |
| Organization | Keep namespaces, labels, and network policies at the desired revision | Move existing labels, policies, or resources to a new Platform-owned structure | Rename a namespace or remove required network access before Applications move |
| Application | Keep Deployments, Services, Secrets, and environment at the desired revision | Move existing workloads to a new Service, Secret, or Pod-template contract | Remove names, ports, secrets, or environment variables still used by running Applications |

Applications currently use one replica with `Recreate`, so a Pod-template migration can interrupt them. Compute migrations must finish and be verified before the compute is marked as aligned with the Platform version.

# Storage

The datacenter provider manages Exoscale SOS. LongLink manages these resources:

| Resource | Repeated reconciliation | One-off migration when needed | Cannot change directly while clients run |
| --- | --- | --- | --- |
| Organization bucket | Keep the bucket and required prefixes present | Create a new prefix, copy existing objects, verify them, and switch clients | Rename or remove a bucket or prefix while Applications still use it |
| Stored objects | Keep required Platform files and metadata present | Backfill files, convert formats, or move objects to versioned keys | Delete active keys or overwrite data with a format old clients cannot read |
| Application IAM | Keep the required policy revision and valid credentials present | Create replacement credentials, roll Applications, verify access, and revoke the old credentials | Remove required permissions or revoke active credentials before Applications switch |

Each storage migration needs a stable ID and persisted progress per Organization or Application. Object moves and credential rotations can then resume after a partial Exoscale failure without running again after completion.

# Database

The datacenter provider manages PostgreSQL. LongLink manages these resources:

| Resource | Repeated reconciliation | One-off migration when needed | Cannot change directly while clients run |
| --- | --- | --- | --- |
| Platform database | Verify connectivity and the expected Alembic head | Apply each Platform Alembic revision once before the new API depends on it | Drop or rename structures still used by an old API replica, or run long blocking changes |
| Organization database | Keep the shared schema, users, roles, and grants at the desired state | Apply each shared-schema revision and data backfill once per Organization | Rename the database or shared schema while Applications use them |
| Application schema | Keep its role, grants, and connection contract at the desired state | Let the Application apply each Application-owned Alembic revision once | Rename the schema, revoke required grants, or run incompatible migrations while old Pods are active |
| Data | Verify required records and projections | Backfill or convert data once in small resumable batches | Rewrite or delete data that running clients still expect |

Alembic already records one-off database revisions. Shared-schema migrations currently run only during complete Application reconciliation; a release must instead apply pending revisions to every Organization and mark each one aligned after verification.

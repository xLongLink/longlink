# DATABASE [AI Draft]

## 1. Purpose

The database layer provides structured, isolated, and governed relational storage for all applications running within a LongLink organization runtime.

LongLink enforces strict database isolation per application. Applications do not share schemas, credentials, or database instances unless explicitly defined by the platform. The control plane governs provisioning, access, backups, and migration orchestration.

The database layer is infrastructure-owned, not application-owned.

---

## 2. Architectural Model

### Isolation Model

For each organization:

- Each installed application receives:
    - A dedicated PostgreSQL database
    - A dedicated database role (user)
    - A unique credential set
    - Restricted network access

No application can connect to another application's database.

Isolation is enforced through:

- Separate database names
- Distinct credentials
- Network-level restrictions
- RBAC-enforced connection mediation

Cross-app access is forbidden unless mediated by the control plane.

---

## 3. Technology

Primary datastore:

- PostgreSQL (managed or self-hosted cluster)

PostgreSQL is selected for:

- Strong ACID guarantees
- Mature ecosystem
- Transactional integrity
- Indexing and constraint support
- Row-level security capabilities (if required)

No application may substitute or embed an alternative relational engine.

---

## 4. Provisioning Model

When an application is installed within an organization:

1. Control plane provisions a new database:
    - Naming convention:

        ```
        org_<org_id>__app_<app_id>
        ```

2. A dedicated database role is created.
3. Privileges are scoped to:
    - CONNECT
    - USAGE
    - ALL privileges within that database only.

4. Credentials are injected securely into the application container.

Provisioning is automated and idempotent.

Deletion of an application triggers:

- Database snapshot
- Soft retention period
- Eventual deletion per retention policy

---

## 5. Connection Model

Applications connect to PostgreSQL via:

- Platform-injected connection string
- Internal network only
- TLS enforced (if cluster requires)

Connection pooling strategy:

- Managed by application runtime or platform proxy (PgBouncer recommended)
- Global connection limits enforced per organization

Applications may not:

- Open arbitrary outbound DB connections
- Use superuser roles
- Modify cluster-level configuration

---

## 6. Schema Ownership

Applications fully own:

- Their schema definitions
- Tables
- Indexes
- Constraints
- Stored procedures (if allowed)

They do not own:

- Cluster configuration
- Extensions unless explicitly permitted
- Cross-database queries
- Cross-organization access

Allowed PostgreSQL extensions must be explicitly whitelisted by the platform.

---

## 7. Migration Model

All schema changes must follow a controlled migration process.

### Requirements:

- Versioned migration files
- Forward-only migrations in production
- Idempotent execution
- Explicit rollback strategy (documented, not necessarily automated)

Migration execution flow:

1. Application deployment initiated.
2. Control plane validates compatibility.
3. Migration executed against the app’s database.
4. Deployment proceeds only if migration succeeds.

Failed migration must:

- Halt deployment
- Preserve prior running version
- Emit audit event

No application may auto-run uncontrolled schema modifications at runtime.

---

## 8. Backup & Recovery

Backups are platform-managed.

### Backup Scope

- Full database snapshot
- WAL archiving (if enabled)
- Per-organization restore capability

### Backup Frequency

Defined in `/BACKUPS.md`, but minimum requirements:

- Daily full backup
- Incremental or WAL continuous archiving
- Defined retention window

### Restore Model

Restore operations must support:

- Entire organization restore
- Single-application database restore
- Point-in-time recovery (if enabled)

Applications cannot initiate restore directly.

---

## 9. Resource Governance

To prevent resource exhaustion:

- Per-database size monitoring
- Connection limits per application
- Query timeout limits
- Optional statement cost limits

Platform may enforce:

- Maximum storage size per application
- Automatic alerts on growth anomalies

Heavy analytical workloads are discouraged unless explicitly supported.

---

## 10. Cross-Application Communication

Direct cross-database queries are prohibited.

If an application requires data from another application:

- It must use:
    - Platform-mediated APIs
    - Event-driven workflows
    - Control-plane brokered services

This prevents:

- Tight coupling
- Hidden dependencies
- Privilege escalation
- Data integrity violations

---

## 11. Security Model

Database security guarantees:

- Unique credentials per application
- No shared roles
- No superuser access
- No raw socket exposure to public network
- Encrypted storage at rest (if infrastructure supports it)
- Encrypted connections (if required by deployment model)

If an application container is compromised:

- Attacker can access only that application’s database
- Cannot enumerate other databases
- Cannot escalate to cluster-level control

This is a core isolation guarantee.

---

## 12. Observability

The platform monitors:

- Connection count
- Slow queries
- Deadlocks
- Replication health
- Disk utilization
- Backup success

Applications do not directly access cluster metrics.

Metrics are aggregated per organization and per application.

---

## 13. Scaling Strategy

Scaling approaches may include:

- Vertical scaling of primary cluster
- Read replicas (if needed)
- Logical partitioning per organization
- Future support for multi-cluster sharding

Critical constraint:

Scaling must preserve:

- Per-application isolation
- Deterministic migration behavior
- Backup consistency guarantees

---

## 14. Failure Modes

Defined failure scenarios:

1. Database unavailable
    - Application returns controlled error
    - Control plane logs event
    - No partial writes

2. Migration failure
    - Deployment halted
    - Previous version remains active

3. Storage exhaustion
    - Writes blocked
    - Alert generated
    - No silent corruption

4. Replication lag (if replicas used)
    - Read consistency rules defined explicitly

All failure behaviors must be deterministic and logged.

---

## 15. Non-Goals

The database layer is not:

- A multi-tenant shared schema
- A cross-app relational mesh
- An analytical data warehouse
- A customizable database hosting service

It is an isolated relational substrate for business applications under strict governance.

---

## 16. Summary

The LongLink database layer provides:

- Strong per-application isolation
- Platform-governed provisioning
- Controlled migration workflows
- Enforced backup and recovery
- Deterministic operational guarantees

It ensures that structured data remains secure, isolated, auditable, and operationally consistent across all applications within an organization runtime.

All relational storage behavior in LongLink must conform to this specification.

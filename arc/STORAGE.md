# STORAGE [AI Draft]

## 1. Purpose

The storage layer provides governed object storage for unstructured and binary data within a LongLink organization runtime.

This includes:

- Documents
- File attachments
- Generated exports
- Media assets
- Import files
- Application-generated artifacts

Storage is platform-owned infrastructure. Applications do not control storage backends, policies, or access semantics. All access is mediated and governed by the control plane.

---

## 2. Architectural Model

LongLink provides S3-compatible object storage per organization, with strict namespace isolation per application.

### Isolation Model

For each organization:

- Each application receives:
    - A dedicated storage namespace (bucket or prefix)
    - Scoped credentials
    - Access limited to its namespace only

Applications cannot:

- Access another application’s storage namespace
- List organization-wide storage
- Access storage across organizations

Isolation is enforced through:

- Bucket-level or prefix-level access policies
- Unique credentials per application
- Network-level restrictions
- Control-plane mediated access flows

---

## 3. Technology

Object storage must be:

- S3-compatible
- Strongly consistent (preferred)
- Encrypted at rest
- Accessible only via internal network

Supported backends may include:

- Managed S3-compatible providers
- Self-hosted S3-compatible systems

Backend implementation details are abstracted from applications.

Applications interact only through platform-injected configuration.

---

## 4. Namespace Model

Namespace naming convention:

```
org_<org_id>/app_<app_id>/
```

or dedicated bucket:

```
org-<org_id>-app-<app_id>
```

The namespace must guarantee:

- No overlap between applications
- Deterministic mapping
- Immutable namespace identity

Applications cannot modify namespace structure outside their root.

---

## 5. Access Model

Applications access storage via:

- Platform-injected credentials
- Internal network endpoint
- Enforced least-privilege IAM policy

Allowed operations:

- PUT (write)
- GET (read)
- DELETE (within namespace)
- LIST (within namespace)

Forbidden operations:

- Cross-namespace reads
- Bucket policy modification
- IAM policy changes
- Raw administrative API access

---

## 6. Control Plane Mediation

In many cases, storage access should be mediated through the control plane:

### Example: User File Download

1. User requests file.
2. Control plane validates:
    - Identity
    - RBAC
    - Organization scope

3. Control plane issues:
    - Short-lived signed URL
      OR
    - Proxied stream response

Applications must not expose long-lived public URLs.

Signed URLs must:

- Be time-limited
- Be scoped to a specific object
- Be non-enumerable

---

## 7. Data Governance

Storage governance rules:

- All objects belong to exactly one application.
- Applications are responsible for metadata tracking in their own database.
- Orphaned objects should be detectable.
- Platform may enforce lifecycle rules.

Retention policies may include:

- Soft delete period
- Automatic archival
- Maximum object size limits

Lifecycle configuration is platform-defined.

---

## 8. Backup & Durability

Object storage durability depends on backend guarantees.

Minimum expectations:

- Redundant storage
- Replication across availability zones (if available)
- Versioning enabled (recommended)
- Periodic integrity checks

If object versioning is enabled:

- Deletes create tombstones.
- Restore capability must be documented.

Backup policies are defined in `/BACKUPS.md`, but storage must support:

- Organization-level restore
- Application-level restore

Applications cannot disable backup mechanisms.

---

## 9. Size & Resource Limits

To prevent abuse or runaway growth:

Platform may enforce:

- Maximum object size
- Total namespace size limit
- Rate limits on uploads
- File type restrictions (optional)

Exceeding limits must result in:

- Deterministic error response
- Audit log entry
- No partial writes

---

## 10. Security Model

Security guarantees:

- Encryption at rest
- TLS for all transport
- Per-application credentials
- No public buckets
- No anonymous access
- No cross-app access

If an application container is compromised:

- Attacker can only access that app’s namespace.
- Cannot list other namespaces.
- Cannot escalate to control plane storage.

Secrets used for storage access must be:

- Injected securely
- Rotatable
- Never embedded in application source

---

## 11. Consistency Model

Preferred: strong read-after-write consistency.

If backend provides eventual consistency:

- Applications must tolerate short propagation delays.
- Critical flows should use explicit confirmation after write.

Storage consistency guarantees must be documented explicitly.

---

## 12. Observability

Platform monitors:

- Storage usage per application
- Upload/download rates
- Error rates
- Large object patterns
- Anomalous access behavior

Applications do not directly access storage infrastructure metrics.

Audit logs must capture:

- Object creation
- Object deletion
- Signed URL generation (if mediated)
- Access denials

---

## 13. Cross-Application File Sharing

Direct namespace sharing is forbidden.

If cross-application file access is required:

- Must be mediated by control plane.
- Explicit permission grant required.
- Access must be time-bound.
- Logged and auditable.

This prevents hidden coupling and uncontrolled data flows.

---

## 14. Failure Modes

Defined failure scenarios:

1. Storage unavailable
    - Write operations fail deterministically.
    - No silent fallback.
    - Event logged.

2. Partial upload failure
    - Object not committed.
    - No corrupted objects allowed.

3. Namespace limit exceeded
    - Upload rejected.
    - Audit event generated.

4. Credential compromise
    - Credentials rotatable.
    - No cross-namespace exposure.

All failures must be explicit and logged.

---

## 15. Non-Goals

The storage layer is not:

- A public CDN
- A shared document system across apps
- A general-purpose file hosting service
- A user-managed bucket system

It is an isolated object storage substrate for governed business applications.

---

## 16. Summary

The LongLink storage layer provides:

- Strict per-application namespace isolation
- Platform-governed access control
- Secure object storage with enforced policies
- Deterministic access patterns
- Backup and durability guarantees
- Centralized auditability

It ensures that unstructured data remains secure, isolated, and operationally consistent within the organization runtime.

All object storage usage within LongLink must conform to this specification.

# Operations

Operations are metadata-only work records for slow platform tasks that continue after an endpoint writes domain state.

```text
Endpoint writes state
        |
        v
Queue operation
        |
        v
Worker claims operation
        |
        v
Handler runs
        |
        v
complete | defer | fail
```

| Kind | Reference | Does |
| --- | --- | --- |
| `application.verify` | `application_id` | Checks app readiness. |
| `application.remove` | `application_id` | Removes deleted app runtime resources. |
| `organization.remove` | `organization_id` | Removes deleted org runtime resources. |

Rules:

- Store only operation metadata here; request payloads, env values, and desired state belong to domain records.
- `implementation/*` contains only decorated handlers; helper logic lives in `src.runtime`.
- Handlers return an outcome; the dispatcher persists `complete`, `defer`, or `fail` with the active lease.
- Handlers must be retry-safe because expired leases can be claimed by another worker.

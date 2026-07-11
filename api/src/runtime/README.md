# Runtime

Runtime code manages Kubernetes resources for one compute registry. The compute registry stores the private gateway URL that the API uses to reach this cluster.

```text
User request
        |
        v
API authenticates and authorizes
        |
        v
API forwards app path with gateway headers
        |
        v
Private gateway routes by application UUID
        |
        v
Application Service
```

| Module | Does |
| --- | --- |
| `resources.py` | Shared kr8s client and resource helpers. |
| `cluster.py` | Organization namespaces, network policy, and cluster inspection. |
| `gateway.py` | Private Envoy gateway manifests and routes. |
| `applications.py` | Application Deployments, Services, Secrets, logs, and cleanup. |
| `kubernetes.py` | Concrete runtime client composed from the runtime classes. |

Rules:

- Users never call the gateway or application Services directly.
- The API owns user authentication and authorization.
- The registry gateway URL must be privately reachable by the API in production.
- The gateway only trusts API requests with the gateway secret and application UUID headers.
- Application pods are reachable only through the gateway network policy.

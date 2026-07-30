# Kubernetes ownership
# - Compute reconciliation owns the system Namespace, public Service, and Envoy gateway.
# - Organization lifecycle operations own tenant Namespaces and NetworkPolicies.
# - Application lifecycle operations own workload Services, Deployments, and Secrets.
# - Lifecycle classes use typed kr8s objects through the shared Kubernetes client.

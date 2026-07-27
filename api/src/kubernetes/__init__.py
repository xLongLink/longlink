# Kubernetes ownership
# - Compute reconciliation owns the system Namespace, public Service, and Envoy gateway.
# - Organization lifecycle operations own tenant Namespaces and NetworkPolicies.
# - Application lifecycle operations own workload Services, Deployments, and Secrets.
# - KubernetesResources is the only kr8s boundary; lifecycle classes provide domain operations.

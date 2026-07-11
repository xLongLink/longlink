from .kubernetes import Kubernetes
from src.database.models.computes import ComputeRegistry


def kubernetes(registry: ComputeRegistry) -> Kubernetes:
    """Build the Kubernetes compute client for one registry record."""

    return Kubernetes(
        registry.kubeconfig,
        registry.proxy_secret,
        registry.ingress_host,
    )

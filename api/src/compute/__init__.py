from .kubernetes import Kubernetes
from src.database.models.computes import ComputeRegistry


def kubernetes(registry: ComputeRegistry) -> Kubernetes:
    """Build the Kubernetes compute client for one registry record."""

    return Kubernetes(
        registry.kubeconfig,
        registry.proxy_secret,
        registry.ingress_host,
        gateway_tls_key=registry.gateway_tls_key,
        gateway_tls_certificate=registry.gateway_tls_certificate,
        gateway_load_balancer_ip=registry.gateway_load_balancer_ip,
    )

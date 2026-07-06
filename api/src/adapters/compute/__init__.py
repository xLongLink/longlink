from .base import Compute
from .k8s import K8s
from src.models.computes import ComputeKind
from src.database.models.computes import ComputeRegistry


def compute_registry_adapter(registry: ComputeRegistry) -> Compute:
    """Build the compute adapter for one registry record."""

    if registry.kind == ComputeKind.kubernetes:
        return K8s(registry.kubeconfig, registry.proxy_secret)

    raise ValueError(f"Unsupported compute registry kind '{registry.kind}'")


__all__ = ["Compute", "K8s", "compute_registry_adapter"]

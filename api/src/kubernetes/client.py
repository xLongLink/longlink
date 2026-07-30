import kr8s
from typing import cast
from kr8s.asyncio import Api
from kr8s.asyncio.objects import Deployment


def deployment_is_ready(deployment: Deployment) -> bool:
    """Return whether every replica belongs to the observed Deployment generation."""

    # Require the controller to observe this generation and make every desired replica available.
    generation = deployment.metadata.get("generation")
    replicas = deployment.spec.get("replicas", 1)
    status = deployment.raw.get("status")
    return (
        isinstance(generation, int)
        and isinstance(replicas, int)
        and isinstance(status, dict)
        and status.get("observedGeneration") == generation
        and status.get("replicas") == replicas
        and status.get("updatedReplicas") == replicas
        and status.get("readyReplicas") == replicas
        and status.get("availableReplicas") == replicas
    )


class Kubernetes:
    """Expose Kubernetes lifecycle abstractions."""

    def __init__(self, kubeconfig: dict[str, object]) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None

        # Import lifecycle classes after the client type is available for their annotations.
        from src.kubernetes.gateway import Gateway
        from src.kubernetes.applications import Applications
        from src.kubernetes.organizations import Organizations

        self.gateway = Gateway(self)
        self.applications = Applications(self)
        self.organizations = Organizations(self)

    async def api(self) -> Api:
        """Return the cached kr8s client for the configured cluster."""

        # Lazily connect so clients that only construct lifecycle objects open no cluster connection.
        if self._api_client is None:
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(str, self._kubeconfig), serviceaccount="")
        return self._api_client

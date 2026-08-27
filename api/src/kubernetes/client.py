import kr8s
from typing import cast
from kr8s.asyncio import Api
from src.kubernetes.gateway import Gateway
from src.kubernetes.applications import Applications
from src.kubernetes.organizations import Organizations


class Kubernetes:
    """Expose Kubernetes lifecycle abstractions."""

    def __init__(self, kubeconfig: dict[str, object]) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None

        self.gateway = Gateway(self)
        self.applications = Applications(self)
        self.organizations = Organizations(self)

    async def api(self) -> Api:
        """Return the cached kr8s client for the configured cluster."""

        # Lazily connect so clients that only construct lifecycle objects open no cluster connection.
        if self._api_client is None:
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(str, self._kubeconfig), serviceaccount="")
        return self._api_client

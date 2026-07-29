from src.kubernetes.gateway import Gateway
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications
from src.kubernetes.organizations import Organizations


class Kubernetes:
    """Expose Kubernetes lifecycle abstractions."""

    def __init__(self, kubeconfig: dict[str, object]) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._resources = KubernetesResources(kubeconfig)
        self.gateway = Gateway(self._resources)
        self.applications = Applications(self._resources)
        self.organizations = Organizations(self._resources)

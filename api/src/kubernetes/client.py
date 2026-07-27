from src.utils import names
from kr8s.asyncio.objects import Pod, Namespace
from src.kubernetes.gateway import Gateway
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications
from src.kubernetes.organizations import Organizations


class Kubernetes:
    """Expose Kubernetes lifecycle abstractions and read-only cluster diagnostics."""

    def __init__(self, kubeconfig: str) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._resources = KubernetesResources(kubeconfig)
        self.gateway = Gateway(self._resources)
        self.applications = Applications(self._resources)
        self.organizations = Organizations(self._resources)

    async def namespaces(self) -> list[str]:
        """List non-core namespaces for cluster diagnostics without mutating them."""

        return [
            namespace.name
            for namespace in await self._resources.list(Namespace)
            if namespace.name not in names.KUBERNETES_SYSTEM_NAMESPACES
        ]

    async def pods(self, namespace: str) -> list[Pod]:
        """List all pods in one namespace for diagnostics."""

        return await self._resources.list(Pod, namespace)

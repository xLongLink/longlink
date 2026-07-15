from src.utils import names
from collections.abc import Callable, Awaitable
from kr8s.asyncio.objects import Pod, Namespace
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import Reconciler, DesiredLocation, ReconcileResult
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications


class Kubernetes:
    """Expose desired-state reconciliation and read-only cluster diagnostics."""

    def __init__(self, kubeconfig: str) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._resources = KubernetesResources(kubeconfig)
        self._reconciler = Reconciler(self._resources)
        self.applications = Applications(self._resources)

    async def reconcile(
        self,
        desired: DesiredLocation,
        proxy_secret: str,
        existing_tls: GatewayTLSMaterial | None = None,
        fence: Callable[[], Awaitable[None]] | None = None,
        stage_tls: Callable[[GatewayTLSMaterial], Awaitable[None]] | None = None,
    ) -> ReconcileResult:
        """Converge the connected cluster to one location's complete desired state."""

        return await self._reconciler.reconcile(desired, proxy_secret, existing_tls, fence, stage_tls)

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


from collections.abc import Callable, Awaitable

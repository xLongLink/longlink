from src.utils import names, templates
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Namespace
from src.kubernetes.gateway import Gateway
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications

TEMPLATES = files("src.kubernetes.templates")


class Kubernetes:
    """Expose namespace, gateway, and application operations for one Kubernetes cluster."""

    def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._resources = KubernetesResources(kubeconfig)
        self.gateway = Gateway(self._resources, proxy_secret)
        self.applications = Applications(self._resources, self.gateway)

    async def namespace(self, organization: str) -> None:
        """Create one managed organization namespace and its network policy."""

        namespace = names.knames(organization)
        manifests = templates.readyml_list(
            TEMPLATES.joinpath("application_network_policy.yml"),
            namespace=namespace,
        )

        # The Namespace is applied first so the following NetworkPolicy has an owner namespace.
        for manifest in manifests:
            await self._resources.upsert(manifest)

    async def delete_namespace(self, organization: str) -> None:
        """Delete one managed organization namespace and tolerate missing namespaces."""

        await self._resources.delete(Namespace, names.knames(organization))
        await self.gateway.sync()

    async def namespaces(self) -> list[str]:
        """List all organization namespaces in the connected cluster."""

        return [
            namespace.name
            for namespace in await self._resources.list(Namespace)
            if namespace.name not in names.KUBERNETES_SYSTEM_NAMESPACES
        ]

    async def pods(self, namespace: str) -> list[Pod]:
        """List all pods in one namespace."""

        return await self._resources.list(Pod, namespace)

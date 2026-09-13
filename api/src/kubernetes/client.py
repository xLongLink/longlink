import kr8s
from typing import cast
from contextlib import AsyncExitStack
from kr8s.asyncio import Api
from kr8s.asyncio.objects import Service, Namespace
from src.kubernetes.gateway import Gateway
from src.kubernetes.storage import Storage
from src.kubernetes.databases import Databases
from src.kubernetes.solutions import Solutions
from src.kubernetes.organizations import Organizations


class Kubernetes:
    """Expose Kubernetes lifecycle abstractions."""

    def __init__(self, kubeconfig: dict[str, object]) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None
        self.connections = AsyncExitStack()

        self.gateway = Gateway(self)
        self.storage = Storage(self)
        self.databases = Databases(self)
        self.solutions = Solutions(self)
        self.organizations = Organizations(self)

    async def api(self) -> Api:
        """Return the cached kr8s client for the configured cluster."""

        # Lazily connect so clients that only construct lifecycle objects open no cluster connection.
        if self._api_client is None:
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(str, self._kubeconfig), serviceaccount="")
        return self._api_client

    async def aclose(self) -> None:
        """Close local tunnels before releasing their Kubernetes HTTP session."""

        # Tunnels depend on the kr8s session and must finish before its transport closes.
        await self.connections.aclose()
        if self._api_client is not None and self._api_client._session is not None:
            await self._api_client._session.aclose()
        self._api_client = None

    async def cluster_uid(self) -> str:
        """Return the stable UID of the configured Kubernetes cluster."""

        # The system Namespace is created with the cluster and provides an identity independent of kubeconfig aliases.
        namespace = Namespace("kube-system", api=await self.api())
        await namespace.refresh()
        metadata = namespace.raw.get("metadata")
        uid = metadata.get("uid") if isinstance(metadata, dict) else None
        if not isinstance(uid, str) or not uid:
            raise RuntimeError("Kubernetes cluster identity is unavailable")
        return uid

    async def portforward(self, name: str, namespace: str, port: int) -> int:
        """Keep a loopback Service tunnel alive until this Kubernetes client closes."""

        # Refresh the selector before kr8s resolves a ready Pod for the Service.
        service = Service(name, namespace=namespace, api=await self.api())
        await service.refresh()
        return await self.connections.enter_async_context(service.portforward(port, local_port="auto"))

import kr8s
from uuid import UUID
from types import TracebackType
from typing import Self, cast
from contextlib import AsyncExitStack
from kr8s.asyncio import Api
from src.kubernetes import namespace
from kr8s.asyncio.objects import Service, Namespace
from src.kubernetes.databases import Databases
from src.kubernetes.solutions import Solutions
from src.kubernetes.organizations import Organizations


class Kubernetes:
    """Own one Compute API connection and its Kubernetes resource lifetimes.

    Database resources have dedicated Organization namespaces; Solutions run in
    the Organization compute namespace. Kubernetes resource facades share this
    client's lazy kr8s connection and its port-forward lifetime.
    """

    def __init__(self, kubeconfig: dict[str, object]) -> None:
        """Initialize components that share one lazy cluster connection."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None
        self._connections = AsyncExitStack()

        self.databases = Databases(self)
        self.solutions = Solutions(self)
        self.organizations = Organizations(self)

    async def __aenter__(self) -> Self:
        """Return this Kubernetes client for an async resource scope."""

        return self

    async def __aexit__(
        self,
        _exc_type: type[BaseException] | None,
        _exc_value: BaseException | None,
        _traceback: TracebackType | None,
    ) -> None:
        """Close this Kubernetes client when its async resource scope ends."""

        await self.aclose()

    async def api(self) -> Api:
        """Return the cached kr8s client for the configured cluster."""

        # Lazily connect so clients that only construct lifecycle objects open no cluster connection.
        if self._api_client is None:
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(str, self._kubeconfig), serviceaccount="")
        return self._api_client

    async def aclose(self) -> None:
        """Close local tunnels before releasing their Kubernetes HTTP session."""

        # Tunnels depend on the kr8s session and must finish before its transport closes.
        await self._connections.aclose()
        if self._api_client is not None and self._api_client._session is not None:
            await self._api_client._session.aclose()
        self._api_client = None

    async def cluster_uid(self) -> str:
        """Return the stable UID of the configured Kubernetes cluster."""

        # The system Namespace is created with the cluster and provides an identity independent of kubeconfig aliases.
        system = Namespace("kube-system", api=await self.api())
        await system.refresh()
        metadata = system.raw.get("metadata")
        uid = metadata.get("uid") if isinstance(metadata, dict) else None
        if not isinstance(uid, str) or not uid:
            raise RuntimeError("Kubernetes cluster identity is unavailable")
        return uid

    async def forward_database(self, organization_id: UUID) -> int:
        """Keep the Organization database tunnel alive until this Kubernetes client closes."""

        # Refresh the selector before kr8s resolves a ready Pod for the Service.
        service = Service("database-rw", namespace=namespace.database(organization_id), api=await self.api())
        await service.refresh()
        return await self._connections.enter_async_context(service.portforward(5432, local_port="auto"))

    async def forward_storage(self) -> int:
        """Keep the private RustFS administration tunnel alive until this client closes."""

        # Forward the cluster service directly so administrator requests never traverse the public storage proxy.
        service = Service("rustfs-svc", namespace="rustfs", api=await self.api())
        await service.refresh()
        return await self._connections.enter_async_context(service.portforward(9000, local_port="auto"))

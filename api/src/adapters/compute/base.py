from abc import ABC, abstractmethod


class Compute(ABC):
    """Compute adapter root.

    Cluster                         # Managed by the control plane
    └── Namespace                   # One per organization
        ├── App A Deployment        # Deployment for App A
        ├── App A Service           # Internal ClusterIP Service for App A
        ├── App A Secret            # Secret containing all app configuration
        └── Proxy                   # Shared internal proxy service
    """

    @abstractmethod
    async def setup(self) -> None:
        """Bootstrap the cluster resources managed by the control plane."""

    @abstractmethod
    async def cleanup(self) -> None:
        """Delete all Kubernetes resources managed by the control plane."""

    @abstractmethod
    async def delete(self, organization: str) -> None:
        """Delete the organization namespace and all managed compute resources."""

    @abstractmethod
    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

    @abstractmethod
    async def application(self, organization: str, application: str, image: str, port: int, secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

    @abstractmethod
    async def remove(self, organization: str, application: str) -> None:
        """Remove one managed application."""

    @abstractmethod
    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

    @abstractmethod
    async def namespaces(self) -> list[str]:
        """List all managed namespaces."""

    @abstractmethod
    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

    @abstractmethod
    async def resources(self) -> dict[str, int | float]:
        """Return total and allocatable cluster resources."""

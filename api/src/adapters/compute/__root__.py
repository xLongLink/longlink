from abc import ABC, abstractmethod
from typing import Any


class Root(ABC):
    """Compute adapter root.

    Cluster                         # Managed by the control plane
    └── Namespace                   # One per organization
        ├── App A Deployment        # Deployment for App A
        ├── App A Service           # Internal ClusterIP Service for App A
        ├── App A Secret            # Secret containing all app configuration
        └── Proxy                   # Shared internal proxy service
    """

    def __init__(self, kubeconfig: str) -> None:
        """Store the shared Kubernetes connection settings."""
        self._kubeconfig = kubeconfig

    @property
    def kubeconfig(self) -> str:
        """Return the Kubernetes configuration path or content."""
        return self._kubeconfig

    @abstractmethod
    async def list(self, organization: str) -> list[str]:
        """List managed applications inside an organization namespace."""

    @abstractmethod
    async def exists(self, organization: str, application: str) -> bool:
        """Return whether one managed application exists."""

    @abstractmethod
    async def create_namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

    @abstractmethod
    async def create_secret(self, organization: str, application: str, values: dict[str, str]) -> None:
        """Create or replace the Secret for one application.

        The Secret contains both sensitive and non-sensitive application
        configuration. The application Deployment is expected to consume this
        Secret through envFrom.
        """

    @abstractmethod
    async def create_application(self, organization: str, application: str, image: str, port: int) -> None:
        """Create or replace one internal application Deployment and Service.

        Expected behavior:
        - create/update Deployment
        - create/update internal ClusterIP Service
        - inject the existing application Secret into the container environment

        The Secret should already exist before this method is called.
        """

    @abstractmethod
    async def create_proxy(self, organization: str) -> None:
        """Create or replace the shared internal proxy for an organization.

        The proxy should be exposed only as an internal ClusterIP Service.
        """

    @abstractmethod
    async def create_cluster_proxy(self, ingress_name: str) -> None:
        """Create or replace the shared cluster-wide proxy entrypoint.

        The proxy is provisioned once for the compute cluster and used by the
        control plane as the stable entrypoint for all proxied app requests.
        """

    @abstractmethod
    async def create(self, organization: str, application: str, image: str, port: int, values: dict[str, str]) -> None:
        """Create or replace one complete managed application stack.

        Expected behavior:
        - ensure the organization namespace exists
        - create or update the application Secret
        - create or update the application Deployment
        - create or update the internal ClusterIP Service
        - update the internal proxy if required
        """

    @abstractmethod
    async def remove(self, organization: str, application: str) -> None:
        """Remove one managed application.

        Expected behavior:
        - delete Deployment
        - delete Service
        - delete Secret
        - remove route from internal proxy if required
        """

    @abstractmethod
    async def delete(self, organization: str) -> None:
        """Delete the organization namespace and all managed compute resources."""

    @abstractmethod
    async def status(self, organization: str, application: str) -> dict[str, Any]:
        """Return runtime status for one managed application."""

    @abstractmethod
    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

    @abstractmethod
    async def usage(
        self,
        organization: str | None = None,
        application: str | None = None,
    ) -> dict[str, Any]:
        """Return resource usage for managed compute resources.

        When both parameters are None, returns aggregate usage across all
        organizations. When only organization is set, returns usage for all
        applications in that namespace. When both are set, returns usage for
        one specific application.
        """

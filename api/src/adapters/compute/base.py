from abc import ABC, abstractmethod


class Compute(ABC):
    """Compute adapter root.

    Cluster                         # Managed by the control plane
    └── Namespace                   # One per organization
        ├── App A Deployment        # Deployment for App A
        ├── App A Service           # Internal ClusterIP Service for App A
        ├── App A Secret            # Secret containing all app configuration
        └── Gateway                 # Shared Envoy gateway service
    """

    @abstractmethod
    async def setup(self) -> None:
        """Bootstrap the cluster gateway resources managed by the control plane."""

    @abstractmethod
    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

    @abstractmethod
    async def application(
        self,
        organization: str,
        application: str,
        application_id: str,
        image: str,
        port: int,
        secrets: dict[str, str],
        rollout_token: str = "",
    ) -> str:
        """Create or replace one internal application Deployment and Service."""

    @abstractmethod
    async def delete_application(self, organization: str, application: str) -> None:
        """Delete one internal application Deployment, Service, and Secret."""

    @abstractmethod
    async def delete_namespace(self, organization: str) -> None:
        """Delete the namespace for one organization."""

    @abstractmethod
    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

    @abstractmethod
    def application_pods(self, organization: str, application: str) -> list[object]:
        """Return pods for one managed application."""

    @abstractmethod
    def application_deployment_ready(self, organization: str, application: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

    @abstractmethod
    async def namespaces(self) -> list[str]:
        """List all managed namespaces."""

    @abstractmethod
    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

    @abstractmethod
    async def resources(self) -> dict[str, int | float]:
        """Return total and allocatable cluster resources."""

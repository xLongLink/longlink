from __future__ import annotations

from abc import ABC, abstractmethod


class Root(ABC):
    """Compute adapter root.
    

    Compute Cluster       # Managed by the control plane
    └── Namespace         # One per organization
        └── Containers    # Application packaged (fastapi)
    """

    @abstractmethod
    async def list(self, organization: str) -> list[str]:
        """List managed compute resources."""


    @abstractmethod
    async def create(self, organization: str, application: str) -> None:
        """Create or replace one compute resource."""


    @abstractmethod
    async def remove(self, organization: str, application: str) -> None:
        """Remove one compute resource."""


    @abstractmethod
    async def delete(self, organization: str) -> None:
        """Delete the namespace and all managed compute resources."""

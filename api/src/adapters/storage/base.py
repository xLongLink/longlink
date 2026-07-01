from abc import ABC, abstractmethod


class Storage(ABC):
    """Storage adapter root.

    Storage Cluster               # Managed by the control plane
    └── Tenant                    # One per organization
        ├── Shared Bucket         # Optional organization-level shared objects
        ├── App A Bucket          # Isolated storage for App A
        └── App B Bucket          # Isolated storage for App B

    Each application has read/write access to its own bucket, and read-only access to shared bucket.
    """

    @abstractmethod
    async def tenant(self, organization: str) -> str:
        """Create the storage tenant for an organization if it does not exist and return a tenant identifier."""

    @abstractmethod
    async def bucket(self, organization: str, application: str) -> str:
        """Create or replace the isolated storage bucket for one application and return a storage URI."""

    @abstractmethod
    async def setup(self) -> None:
        """Initialize the storage backend used by the control plane."""

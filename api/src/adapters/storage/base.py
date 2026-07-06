from abc import ABC, abstractmethod
from typing import TypedDict
from datetime import datetime


class StorageObjectData(TypedDict):
    """Describe one object stored in a bucket."""

    key: str
    size: int
    etag: str | None
    last_modified: datetime | None


class StorageBucketUsage(TypedDict):
    """Describe aggregate storage usage for one bucket."""

    space_used: int
    object_count: int


class StorageRuntimeCredentials(TypedDict):
    """Describe credentials safe to inject into one application runtime."""

    access_key_id: str
    secret_access_key: str


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
    async def shared_bucket(self, organization: str) -> str:
        """Create or return the shared organization bucket and return its name."""

    @abstractmethod
    async def bucket(self, organization: str, application: str) -> str:
        """Create or replace the isolated storage bucket for one application and return a storage URI."""

    @abstractmethod
    async def application_credentials(self, organization: str, application: str) -> StorageRuntimeCredentials:
        """Return credentials with read/write app access and read-only shared access."""

    @abstractmethod
    async def delete_bucket(self, bucket_name: str) -> None:
        """Delete one bucket and its objects."""

    @abstractmethod
    async def setup(self) -> None:
        """Initialize the storage backend used by the control plane."""

    @abstractmethod
    async def buckets(self) -> list[str]:
        """List buckets on the storage backend."""

    @abstractmethod
    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""

    @abstractmethod
    async def bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate usage details for one bucket."""

from typing import Literal, Protocol, TypedDict

StorageAccess = Literal["read", "write"]


class StorageRuntimeCredentials(TypedDict):
    """Describe credentials safe to inject into one application runtime."""

    access_key_id: str
    secret_access_key: str


class Storage(Protocol):
    """Storage adapter root.

    Storage Backend                     # Managed by the LongLink Platform
    ├── assigned organization bucket    # Optional organization-level shared objects
    ├── assigned App A bucket           # Isolated storage for App A
    └── assigned App B bucket           # Isolated storage for App B

    Each application has read/write access to its own bucket, and read-only access to shared bucket.
    """

    async def create(self, bucket: str) -> str:
        """Create or return one bucket and return its name."""
        ...

    async def delete(self, bucket: str) -> None:
        """Delete one bucket and its objects."""
        ...

    async def credentials(self, bucket: str, access: StorageAccess) -> StorageRuntimeCredentials:
        """Create credentials for one bucket access level."""
        ...

    async def revoke(self, bucket: str) -> None:
        """Revoke credentials previously created for one bucket."""
        ...

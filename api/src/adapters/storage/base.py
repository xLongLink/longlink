from typing import Protocol, TypedDict, NotRequired


class StorageObjectData(TypedDict):
    """Describe one object stored in a bucket."""

    key: str
    size: int
    etag: str | None


class StorageBucketUsage(TypedDict):
    """Describe aggregate storage usage for one bucket."""

    space_used: int
    object_count: int


class StorageRuntimeCredentials(TypedDict):
    """Describe credentials safe to inject into one application runtime."""

    access_key_id: str
    secret_access_key: str
    role_id: NotRequired[str | None]


class Storage(Protocol):
    """Storage adapter root.

    Storage Backend                     # Managed by the LongLink Platform
    ├── assigned organization bucket    # Optional organization-level shared objects
    ├── assigned App A bucket           # Isolated storage for App A
    └── assigned App B bucket           # Isolated storage for App B

    Each application has read/write access to its own bucket, and read-only access to shared bucket.
    """

    async def bucket(self, bucket_name: str) -> str:
        """Create or return one assigned bucket and return its name."""
        ...

    async def delete_bucket(self, bucket_name: str) -> None:
        """Delete one bucket and its objects."""
        ...

    async def buckets(self) -> list[str]:
        """List buckets on the storage backend."""
        ...

    async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[StorageObjectData]:
        """List object metadata for one bucket."""
        ...

    async def bucket_usage(self, bucket_name: str) -> StorageBucketUsage:
        """Return aggregate usage details for one bucket."""
        ...

    async def runtime_credentials(self, name: str, bucket_name: str, shared_bucket_name: str) -> StorageRuntimeCredentials:
        """Create credentials for one application bucket and one shared bucket."""
        ...

    async def revoke_runtime_credentials(self, credentials: StorageRuntimeCredentials) -> None:
        """Revoke credentials previously created for one application runtime."""
        ...

from typing import Protocol, TypedDict


class StorageRuntimeCredentials(TypedDict):
    """Describe access keys injected into one application runtime.

    Production providers must scope them to the assigned Organization bucket and Application prefixes.
    """

    access_key_id: str
    secret_access_key: str


class Storage(Protocol):
    """Define the retry-safe provider contract for Organization buckets and Application prefix credentials.

    Provisioning uses registry authority, while production runtimes receive bucket-and-prefix-scoped least-privilege keys.
    """

    async def create(self, bucket: str) -> str:
        """Create or return one bucket and return its name."""
        ...

    async def delete(self, bucket: str) -> None:
        """Delete one bucket and its objects."""
        ...

    async def delete_prefix(self, bucket: str, prefix: str) -> None:
        """Delete every object under one prefix without deleting its bucket."""
        ...

    async def credentials(
        self,
        name: str,
        bucket: str,
        read_prefixes: tuple[str, ...],
        write_prefix: str,
    ) -> StorageRuntimeCredentials:
        """Converge and return runtime credentials for one Application's storage prefixes.

        Implementations must converge after partial prior attempts so retries do not accumulate active credentials.
        """
        ...

    async def revoke(self, name: str) -> None:
        """Revoke one Application's runtime credentials and tolerate already-absent provider state.

        The operation must be safe to retry during cleanup.
        """
        ...

    async def discard(self, access_key_id: str) -> None:
        """Delete one exact unpersisted runtime access key without affecting a replacement generation."""
        ...

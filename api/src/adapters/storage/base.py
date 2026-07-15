from typing import Literal, Protocol, TypedDict

StorageAccess = Literal["read", "write"]


class StorageRuntimeCredentials(TypedDict):
    """Describe access keys injected into one application runtime.

    Production providers must scope them to the assigned bucket and access level instead of exposing registry credentials.
    """

    access_key_id: str
    secret_access_key: str


class Storage(Protocol):
    """Define the retry-safe provider contract for assigned organization or application buckets and access-specific credentials.

    Provisioning uses registry authority, while production runtimes receive bucket-scoped least-privilege keys.
    """

    async def create(self, bucket: str) -> str:
        """Create or return one bucket and return its name."""
        ...

    async def delete(self, bucket: str) -> None:
        """Delete one bucket and its objects."""
        ...

    async def credentials(self, bucket: str, access: StorageAccess) -> StorageRuntimeCredentials:
        """Converge and return runtime credentials scoped to one bucket and requested read or write access.

        Implementations must converge after partial prior attempts so retries do not accumulate active credentials.
        """
        ...

    async def revoke(self, bucket: str) -> None:
        """Revoke runtime credentials for one bucket and tolerate already-absent provider state.

        The operation must be safe to retry during cleanup.
        """
        ...

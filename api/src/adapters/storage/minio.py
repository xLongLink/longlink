from .s3 import S3
from .base import Storage, StorageRuntimeCredentials


class MinIO(S3, Storage):
    """Provide the development-only S3-compatible storage adapter.

    It intentionally reuses registry credentials for runtimes and does not provide production tenant credential isolation.
    """

    async def credentials(
        self,
        name: str,
        bucket: str,
        read_prefixes: tuple[str, ...],
        write_prefix: str,
    ) -> StorageRuntimeCredentials:
        """Return shared development credentials regardless of the requested prefix grants.

        This local-only shortcut is not a least-privilege production contract.
        """

        # Local MinIO uses the development root credentials until local policy management is needed.
        return {
            "access_key_id": self._access_key_id,
            "secret_access_key": self._secret_access_key,
        }

    async def revoke(self, name: str) -> None:
        """Ignore local runtime credential revocation."""

        # Local MinIO credentials are shared development credentials and are not application-scoped.

    async def discard(self, access_key_id: str) -> None:
        """Ignore local runtime credential cleanup."""

        # Local MinIO credentials are shared development credentials and are not application-scoped.

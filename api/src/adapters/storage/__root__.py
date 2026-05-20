from __future__ import annotations

from abc import ABC, abstractmethod


class Root(ABC):
    """Storage adapter root interface.

    Storage Cluster       # Managed by the control plane
    └── Tenant            # One per organization
        └── Bucket        # Each app gets isolated storage
        └── Objects   # Managed by each app (ffspec)
    """

    def __init__(
        self,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        """Store the shared storage connection settings."""
        self._protocol = protocol
        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key

    @abstractmethod
    def list(self) -> list[str]:
        """List storage buckets."""

    @abstractmethod
    def create(self, bucket_name: str) -> None:
        """Create one storage bucket."""

    @abstractmethod
    def delete(self, bucket_name: str) -> None:
        """Delete one storage bucket."""

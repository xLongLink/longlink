from __future__ import annotations

from abc import ABC, abstractmethod


class Root(ABC):
    """Storage adapter root interface.
    
    Storage Cluster       # Managed by the control plane
    └── Tenant            # One per organization
        └── Bucket        # Each app gets isolated storage
            └── Objects   # Managed by each app (ffspec)
    """

    @abstractmethod
    def list(self) -> list[str]:
        """List storage buckets."""

    @abstractmethod
    def create(self, bucket_name: str) -> None:
        """Create one storage bucket."""

    @abstractmethod
    def delete(self, bucket_name: str) -> None:
        """Delete one storage bucket."""

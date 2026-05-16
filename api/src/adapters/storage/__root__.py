from __future__ import annotations

from abc import ABC, abstractmethod


class Root(ABC):
    """Storage adapter root interface."""

    @abstractmethod
    def list(self) -> list[str]:
        """List storage buckets."""

    @abstractmethod
    def create(self, bucket_name: str) -> None:
        """Create one storage bucket."""

    @abstractmethod
    def delete(self, bucket_name: str) -> None:
        """Delete one storage bucket."""

from __future__ import annotations

from abc import ABC, abstractmethod


class Root(ABC):
    """Compute adapter root."""

    @abstractmethod
    def list(self) -> list[str]:
        """List managed compute resources."""


    @abstractmethod
    def create(self, name: str, image: str) -> list[dict]:
        """Create or replace one compute resource."""


    @abstractmethod
    def delete(self, name: str) -> list[dict]:
        """Delete one compute resource."""


    @abstractmethod
    def apply(self) -> list[dict]:
        """Apply the persisted compute state to the cluster."""


    @abstractmethod
    def save(self, filename: str | None = None):
        """Persist the current desired cluster state to YAML."""


    @abstractmethod
    def load(self, filename: str | None = None) -> list[dict]:
        """Load state from YAML and rebuild the in-memory application map."""


    @abstractmethod
    def replace_applications(self, applications: dict[str, str]) -> list[dict]:
        """Replace managed applications with a new application map."""

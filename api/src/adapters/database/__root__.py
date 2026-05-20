from __future__ import annotations

from abc import ABC, abstractmethod


class Database(ABC):
    """Database adapter root interface, extended by specific database implementations.

    Server              # Connected to the database server (e.g. PostgreSQL, MySQL, etc.)
    └── Database        # One for each organization
        └── Schema      # One for each application
            └── Tables  # Managed by the applications, using an ORM (e.g. Prisma, SQLAlchemy, etc.)
    """

    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sslmode: str | None = None,
        maintenance_database: str = "postgres",
    ) -> None:
        """Store the shared database connection settings."""
        self._kwargs: dict[str, str | int] = {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "dbname": maintenance_database,
        }
        self._maintenance_database = maintenance_database

        if sslmode:
            self._kwargs["sslmode"] = sslmode

    @abstractmethod
    async def list(self, organization: str) -> list[str]:
        """List created schemas for an organization."""

    @abstractmethod
    async def create(self, organization: str, application: str) -> None:
        """Create one schema in the given organization for the given application."""

    @abstractmethod
    async def remove(self, organization: str, application: str) -> None:
        """Delete one schema in the given organization for the given application."""

    @abstractmethod
    async def delete(self, organization: str) -> None:
        """Delete the entire database for the given organization."""

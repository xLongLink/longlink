from abc import ABC, abstractmethod
from uuid import UUID
from typing import TypedDict
from .types import DatabaseSchemaUsage


class DatabaseRuntimeConnection(TypedDict):
    """Describe database connection settings safe to inject into one application runtime."""

    host: str
    port: int
    password: str
    username: str
    database_name: str


class Database(ABC):
    """Database adapter.

    Server              # Connected to the database server, e.g. PostgreSQL, MySQL
    └── Database        # One for each organization
        └── Schema      # One for each application
            └── Tables  # Managed by the application ORM, e.g. Prisma, SQLAlchemy

    Database structure for one organization:
    ├── shared Schema  # Organization-owned tables, readable by every application.
    ├── app_a Schema   # Application-owned tables, writable by app_a.
    └── app_n Schema   # Application-owned tables, writable by app_n.

    Organization creation owns database creation and tenant migrations. Application creation owns
    only the application schema and runtime role inside the already-prepared organization database.

    Each application has read/write access to its own schema, and read-only access to shared tables.
    """

    @abstractmethod
    def shared_schema_url(self, organization: UUID) -> str:
        """Return the shared-schema database URL for one organization."""

    @abstractmethod
    async def prepare_organization_database(self, organization: UUID, shared_schema_url: str) -> None:
        """Ensure one organization's database and shared schema are ready."""

    @abstractmethod
    async def schema(self, organization: UUID, application: UUID) -> DatabaseRuntimeConnection:
        """Create or replace the schema for one application and return runtime connection settings."""

    @abstractmethod
    async def delete_schema(self, organization: UUID, application: UUID) -> None:
        """Delete the schema and runtime login role for one application."""

    @abstractmethod
    async def delete_database(self, organization: UUID) -> None:
        """Delete the database for one organization."""

    @abstractmethod
    async def schema_usage(self, database_name: str) -> list[DatabaseSchemaUsage]:
        """Return usage details for schemas in a database."""

    @abstractmethod
    async def usage(self) -> dict[str, int]:
        """Return database usage for the backend."""

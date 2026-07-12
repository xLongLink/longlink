from abc import ABC, abstractmethod
from uuid import UUID
from typing import TypedDict
from .types import DatabaseTableRows, DatabaseSchemaUsage, DatabaseTableColumns
from contextlib import AbstractAsyncContextManager
from sqlalchemy.ext.asyncio import AsyncConnection


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
    def connection(
        self,
        database: str,
        *,
        autocommit: bool = False,
        search_path: str | None = None,
    ) -> AbstractAsyncContextManager[AsyncConnection]:
        """Open one managed database connection."""

    @abstractmethod
    async def prepare_organization_database(self, organization: str) -> str:
        """Ensure one organization's database and shared schema are ready."""

    @abstractmethod
    async def schema(
        self,
        organization: str,
        application: str,
        *,
        organization_id: UUID,
        application_id: UUID,
    ) -> DatabaseRuntimeConnection:
        """Create or replace the schema for one application and return runtime connection settings."""

    @abstractmethod
    async def delete_schema(
        self,
        organization: str,
        application: str,
        *,
        organization_id: UUID,
        application_id: UUID,
    ) -> None:
        """Delete the schema and runtime login role for one application."""

    @abstractmethod
    async def delete_database(self, organization: str) -> None:
        """Delete the database for one organization."""

    @abstractmethod
    async def databases(self) -> list[str]:
        """List all databases on the server."""

    @abstractmethod
    async def schemas(self, database_name: str) -> list[str]:
        """List all schemas in a database."""

    @abstractmethod
    async def schema_usage(self, database_name: str) -> list[DatabaseSchemaUsage]:
        """Return usage details for schemas in a database."""

    @abstractmethod
    async def table_columns(self, database_name: str, schema_name: str) -> list[DatabaseTableColumns]:
        """Return tables and columns for one schema."""

    @abstractmethod
    async def table_rows(self, database_name: str, schema_name: str, table_name: str, *, limit: int = 100) -> DatabaseTableRows:
        """Return preview rows for one table."""

    @abstractmethod
    async def usage(self) -> dict[str, int]:
        """Return database usage for the backend."""

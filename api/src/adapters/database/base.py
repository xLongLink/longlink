from abc import ABC, abstractmethod
from .types import DatabaseTableData, DatabaseTableUsage, DatabaseSchemaUsage
from .shared import SharedUser


class Database(ABC):
    """Database adapter.

    Server              # Connected to the database server, e.g. PostgreSQL, MySQL
    └── Database        # One for each organization
        └── Schema      # One for each application
            └── Tables  # Managed by the application ORM, e.g. Prisma, SQLAlchemy

    Database structure for one organization:
    ├── (org) Users + other shared tables
    ├── (app a) Schema
    └── (app ...) Schema

    Each application has read/write access to its own schema, and read-only access to shared tables.
    """

    @abstractmethod
    async def database(self, organization: str) -> str:
        """Create the database for an organization if it does not exist and return a connection DSN."""


    @abstractmethod
    async def sync_users(self, organization: str, users: list[SharedUser]) -> None:
        """Synchronize the shared organization users table."""


    @abstractmethod
    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""


    @abstractmethod
    async def delete_schema(self, organization: str, application: str) -> None:
        """Delete the schema and runtime login role for one application."""


    @abstractmethod
    async def delete_database(self, organization: str) -> None:
        """Delete the database for one organization."""


    @abstractmethod
    async def setup(self) -> None:
        """Initialize the database backend used by the control plane."""


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
    async def table_usage(self, database_name: str, schema_name: str, table_name: str) -> DatabaseTableUsage | None:
        """Return usage details for one table in a database."""


    @abstractmethod
    async def tables(self, database_name: str, schema_name: str, *, limit: int = 100) -> list[DatabaseTableData]:
        """Return tables, columns, and preview rows for one schema."""


    @abstractmethod
    async def table(self, database_name: str, schema_name: str, table_name: str, *, limit: int = 100) -> DatabaseTableData | None:
        """Return columns and preview rows for one table."""


    @abstractmethod
    async def usage(self) -> dict[str, int]:
        """Return database usage for the backend."""

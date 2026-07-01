from abc import ABC, abstractmethod
from typing import TypedDict


class DatabaseSchemaUsage(TypedDict):
    """Describe storage usage for one database schema."""

    name: str
    space_used: int
    table_count: int
    row_estimate: int


class DatabaseTableUsage(TypedDict):
    """Describe storage usage for one database table."""

    name: str
    space_used: int
    row_estimate: int


DatabaseCellValue = str | int | float | bool | None


class DatabaseTableColumn(TypedDict):
    """Describe one database table column."""

    name: str
    type: str
    nullable: bool
    position: int


class DatabaseTableData(TypedDict):
    """Describe one database table with preview rows."""

    name: str
    schema_name: str
    columns: list[DatabaseTableColumn]
    rows: list[dict[str, DatabaseCellValue]]


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

    Each application has read/write access to it's own schema, and read-only access to shared tables.
    """

    @abstractmethod
    async def database(self, organization: str) -> str:
        """Create the database for an organization if it does not exist and return a connection DSN."""

    @abstractmethod
    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""

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

from abc import ABC, abstractmethod
from uuid import UUID
from typing import TypedDict
from .types import DatabaseSchemaUsage
from src.models.infrastructure import DatabaseSSLMode


class DatabaseRuntimeConnection(TypedDict):
    """Describe least-privilege connection material injected into one application runtime.

    It targets an organization database through an application role, not through registry administrator credentials.
    """

    host: str
    port: int
    password: str
    sslmode: DatabaseSSLMode
    username: str
    database_name: str


class Database(ABC):
    """Define the retry-safe provider contract for one database per organization and one writable schema and role per application.

    Provisioning uses registry authority, while runtime roles receive read-only access to the organization's shared schema.
    """

    @abstractmethod
    def shared_schema_url(self, organization: UUID) -> str:
        """Return a control-plane URL targeting one organization's shared schema for SDK migrations.

        This URL carries provisioning authority and must not be injected into application runtimes.
        """

    @abstractmethod
    async def prepare_organization_database(self, organization: UUID, shared_schema_url: str) -> None:
        """Idempotently prepare the organization database and SDK-owned shared schema for the supplied migration URL.

        Implementations must safely converge when orchestration retries the operation.
        """

    @abstractmethod
    async def schema(self, organization: UUID, application: UUID, password: str) -> DatabaseRuntimeConnection:
        """Idempotently converge one application's schema, runtime role, password, and least-privilege grants.

        Return only application-scoped connection material within the organization database.
        """

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

from tenant.models import User

from .base import Database
from .postgres import Postgres
from src.models.databases import DatabaseKind
from src.database.models.databases import DatabaseRegistry


def database_registry_adapter(registry: DatabaseRegistry) -> Database:
    """Build the database adapter for one registry record."""

    if registry.kind == DatabaseKind.postgresql:
        return Postgres(
            registry.host,
            registry.port,
            registry.username,
            registry.password,
            runtime_host=registry.runtime_host,
            runtime_port=registry.runtime_port,
        )

    raise ValueError(f"Unsupported database registry kind '{registry.kind}'")


__all__ = ["Database", "Postgres", "User", "database_registry_adapter"]

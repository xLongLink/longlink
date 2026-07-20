from typing import TypedDict
from src.models.types import DatabaseSSLMode


class DatabaseRuntimeConnection(TypedDict):
    """Describe least-privilege connection material injected into one Application runtime."""

    host: str
    port: int
    password: str
    sslmode: DatabaseSSLMode
    username: str
    database_name: str


class DatabaseSchemaUsage(TypedDict):
    """Describe storage usage for one database schema."""

    name: str
    space_used: int
    table_count: int

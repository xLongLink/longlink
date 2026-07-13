from typing import TypedDict


class DatabaseSchemaUsage(TypedDict):
    """Describe storage usage for one database schema."""

    name: str
    space_used: int
    table_count: int

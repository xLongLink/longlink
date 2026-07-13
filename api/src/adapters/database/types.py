from typing import TypedDict


class DatabaseSchemaUsage(TypedDict):
    """Describe storage usage for one database schema."""

    name: str
    space_used: int
    table_count: int


class DatabaseTableColumn(TypedDict):
    """Describe one database table column."""

    name: str
    type: str
    nullable: bool
    position: int


class DatabaseTableColumns(TypedDict):
    """Describe one database table with its columns."""

    name: str
    schema_name: str
    columns: list[DatabaseTableColumn]

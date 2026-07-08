from typing import TypedDict


class DatabaseSchemaUsage(TypedDict):
    """Describe storage usage for one database schema."""

    name: str
    space_used: int
    table_count: int
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

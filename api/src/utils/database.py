import re
import asyncio
import psycopg2
from src.env import env
from psycopg2 import sql
from src.models.databases import DatabaseOverviewMetric

_DATABASE_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


async def create(database_name: str) -> None:
    """Validate and create a database in provisioned PostgreSQL cluster."""
    if not _DATABASE_NAME_PATTERN.fullmatch(database_name):
        raise ValueError(
            "Database name must start with a letter/underscore and contain only letters, numbers, and underscores"
        )

    await asyncio.to_thread(_create_sync, database_name)


async def list_overview_metrics() -> list[DatabaseOverviewMetric]:
    """Return user-facing metrics about provisioned PostgreSQL cluster."""
    return await asyncio.to_thread(_list_overview_metrics_sync)


def _create_sync(database_name: str) -> None:
    """Create database in PostgreSQL maintenance database connection."""
    connection_kwargs: dict[str, str | int] = {
        "host": env.ENV_PROVISION_DATABASE_HOST,
        "port": env.ENV_PROVISION_DATABASE_PORT,
        "user": env.ENV_PROVISION_DATABASE_USERNAME,
        "password": env.ENV_PROVISION_DATABASE_PASSWORD,
        "dbname": env.ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE,
    }
    if env.ENV_PROVISION_DATABASE_SSLMODE:
        connection_kwargs["sslmode"] = env.ENV_PROVISION_DATABASE_SSLMODE

    admin_connection = psycopg2.connect(**connection_kwargs)
    try:
        admin_connection.autocommit = True
        with admin_connection.cursor() as cursor:
            # Guard against duplicate DB names before CREATE DATABASE.
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (database_name,)
            )
            if cursor.fetchone() is not None:
                raise ValueError(f"Database '{database_name}' already exists")

            # Use SQL identifier escaping to prevent injection in DB name.
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )
    finally:
        admin_connection.close()


def _list_overview_metrics_sync() -> list[DatabaseOverviewMetric]:
    """Collect cluster metrics from PostgreSQL system catalogs."""
    connection_kwargs: dict[str, str | int] = {
        "host": env.ENV_PROVISION_DATABASE_HOST,
        "port": env.ENV_PROVISION_DATABASE_PORT,
        "user": env.ENV_PROVISION_DATABASE_USERNAME,
        "password": env.ENV_PROVISION_DATABASE_PASSWORD,
        "dbname": env.ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE,
    }
    if env.ENV_PROVISION_DATABASE_SSLMODE:
        connection_kwargs["sslmode"] = env.ENV_PROVISION_DATABASE_SSLMODE

    admin_connection = psycopg2.connect(**connection_kwargs)
    try:
        with admin_connection.cursor() as cursor:
            # Gather counts and storage usage from system catalogs.
            cursor.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE datistemplate = false) AS total_databases,
                    COUNT(*) FILTER (
                        WHERE datistemplate = false
                        AND datname NOT IN ('postgres')
                    ) AS created_databases,
                    COALESCE(SUM(pg_database_size(datname)) FILTER (WHERE datistemplate = false), 0) AS used_storage_bytes,
                    MAX(pg_database_size(datname)) FILTER (WHERE datistemplate = false) AS largest_database_bytes
                FROM pg_database
                """
            )
            (
                total_databases,
                created_databases,
                used_storage_bytes,
                largest_database_bytes,
            ) = cursor.fetchone()

            # Free storage cannot be queried reliably without infra-level quotas.
            free_storage_bytes: int | None = None

        return [
            DatabaseOverviewMetric(
                key="total_databases",
                label="Total Databases",
                value=str(total_databases or 0),
                description="Non-template databases visible in cluster.",
            ),
            DatabaseOverviewMetric(
                key="created_databases",
                label="Created Databases",
                value=str(created_databases or 0),
                description="Databases created for workloads (excluding postgres default DB).",
            ),
            DatabaseOverviewMetric(
                key="used_storage_bytes",
                label="Used Storage",
                value=str(used_storage_bytes or 0),
                unit="bytes",
                description="Total size sum for all non-template databases.",
            ),
            DatabaseOverviewMetric(
                key="largest_database_bytes",
                label="Largest Database",
                value=str(largest_database_bytes or 0),
                unit="bytes",
                description="Largest single non-template database size.",
            ),
            DatabaseOverviewMetric(
                key="free_storage_bytes",
                label="Free Storage",
                value="N/A" if free_storage_bytes is None else str(free_storage_bytes),
                unit=None if free_storage_bytes is None else "bytes",
                description="Infra quota metric not exposed by PostgreSQL catalogs.",
            ),
        ]
    finally:
        admin_connection.close()

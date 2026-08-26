import asyncio
import argparse
import subprocess
from pathlib import Path
from pydantic import Field, field_validator
from sqlmodel import col
from contextlib import suppress
from sqlalchemy import select
from src.errors import ConflictError
from src.environments import env
from src.models.types import Image, DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from src.models.computes import ComputeRegistryCreate
from src.database.session import session_scope
from src.database.services import users, compute, storage, database, applications, organizations
from src.models.infrastructure import DatabaseConfiguration, exoscale_zone
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


class SeedSettings(BaseSettings):
    """Define development infrastructure registrations."""

    # Compute registry
    KUBECONFIG: Path = Path(__file__).resolve().parents[1] / "kubeconfig.yaml"

    # Database registry
    APPLICATION_DATABASE_URL: str | None = None
    LOCAL_DATABASE_PORT: int = Field(default=15432, ge=1, le=65535)
    LOCAL_DOCKER_NETWORK: str = Field(default="longlink-dev", min_length=1)

    # Storage registry
    EXOSCALE_API_KEY: str = Field(min_length=1)
    EXOSCALE_API_SECRET: str = Field(min_length=1)
    EXOSCALE_STORAGE_ENDPOINT_URL: str = Field(min_length=1)

    model_config = SettingsConfigDict(
        env_file=".env.seed",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("EXOSCALE_STORAGE_ENDPOINT_URL")
    @classmethod
    def validate_storage_endpoint(cls, value: str) -> str:
        """Require a supported Exoscale SOS endpoint."""

        # Reject unsupported providers and malformed Exoscale endpoint URLs at the seed boundary.
        exoscale_zone(value)
        return value


def local_database_host(settings: SeedSettings) -> str:
    """Return the local Docker host address reachable from k3d application pods."""

    # Resolve the current network gateway because Docker can change it after recreation.
    result = subprocess.run(
        ["docker", "network", "inspect", settings.LOCAL_DOCKER_NETWORK, "--format", "{{range .IPAM.Config}}{{.Gateway}}{{end}}"],
        capture_output=True,
        check=True,
        text=True,
    )
    host = result.stdout.strip()
    if not host:
        raise RuntimeError(f"Docker network '{settings.LOCAL_DOCKER_NETWORK}' has no gateway address")
    return host


def application_database_configuration(settings: SeedSettings) -> DatabaseConfiguration:
    """Return the validated Application database registry configuration."""

    # Use the isolated Docker PostgreSQL service when no remote database is configured.
    if settings.APPLICATION_DATABASE_URL is None:
        return DatabaseConfiguration(
            host=local_database_host(settings),
            port=settings.LOCAL_DATABASE_PORT,
            username="admin",
            password="admin",
            sslmode=DatabaseSSLMode.disable,
        )

    # Parse a PostgreSQL administrator URL with the supported connection option.
    database_url = make_url(settings.APPLICATION_DATABASE_URL)
    if database_url.get_backend_name() != "postgresql" or set(database_url.query) - {"sslmode"}:
        raise ValueError("Application database URL must use PostgreSQL and only supports the sslmode query option")

    # Validate all connection fields before persisting administrator credentials.
    try:
        return DatabaseConfiguration.model_validate(
            {
                "host": database_url.host or "",
                "port": database_url.port or 5432,
                "username": database_url.username or "",
                "password": database_url.password or "",
                "sslmode": database_url.query.get("sslmode", DatabaseSSLMode.require.value),
            }
        )
    except ValueError:
        raise ValueError("Application database URL has invalid connection settings") from None


async def seed_infrastructure(
    settings: SeedSettings, *, compute_name: str, database_name: str, storage_name: str
) -> tuple[ComputeRegistry, DatabaseRegistry, StorageRegistry]:
    """Register the configured infrastructure and return its registries."""

    # Validate the configured Kubernetes compute before mutating Platform state.
    compute_config = ComputeRegistryCreate.model_validate(
        {"name": "development compute", "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8")}
    )

    # Resolve either the configured Application database or the local PostgreSQL service.
    database_config = application_database_configuration(settings)

    # Register the configured compute and queue its reconciliation when newly created.
    with suppress(ConflictError):
        async with session_scope() as session:
            await compute.create(session, compute_name, compute_config.kubeconfig)
            await session.commit()

    # Register the configured database unless it already exists.
    with suppress(ConflictError):
        async with session_scope() as session:
            await database.create(
                session,
                database_name,
                database_config.host,
                database_config.port,
                database_config.username,
                database_config.password,
                database_config.sslmode,
            )
            await session.commit()

    # Register the configured storage unless it already exists.
    with suppress(ConflictError):
        async with session_scope() as session:
            await storage.create(
                session,
                storage_name,
                settings.EXOSCALE_STORAGE_ENDPOINT_URL,
                settings.EXOSCALE_API_KEY,
                settings.EXOSCALE_API_SECRET,
            )
            await session.commit()

    async with session_scope() as session:
        compute_registry = await session.scalar(select(ComputeRegistry).where(col(ComputeRegistry.name) == compute_name))
        database_registry = await session.scalar(select(DatabaseRegistry).where(col(DatabaseRegistry.name) == database_name))
        storage_registry = await session.scalar(select(StorageRegistry).where(col(StorageRegistry.name) == storage_name))
        if compute_registry is None or database_registry is None or storage_registry is None:
            raise RuntimeError("Configured infrastructure is not available")
        return compute_registry, database_registry, storage_registry


async def seed_local_development(settings: SeedSettings) -> None:
    """Register local infrastructure and create the local example Organization and Application."""

    compute_registry, database_registry, storage_registry = await seed_infrastructure(
        settings,
        compute_name="development compute",
        database_name="development database",
        storage_name="local storage",
    )

    # The init workflow has no running API replica to create the administrator first.
    async with session_scope() as session:
        await users.ensure_administrator(session)
        administrator = await users.by_email(session, env.ADMIN_EMAIL)
        if administrator is None:
            raise RuntimeError("Configured administrator is not available")

        organization = await session.scalar(select(Organization).where(col(Organization.slug) == "development"))
        if organization is None:
            organization = await organizations.create(
                session,
                "Development",
                administrator,
                compute_id=compute_registry.id,
                storage_id=storage_registry.id,
                database_id=database_registry.id,
            )

        application = await session.scalar(
            select(Application).where(
                col(Application.organization_id) == organization.id,
                col(Application.slug) == "sample",
            )
        )
        if application is None:
            await applications.create(
                session,
                organization.id,
                "Sample",
                Image("localhost:15000/sample:dev"),
                {},
                "A sample application for local development.",
            )
        await session.commit()


class CloudSeedSettings(SeedSettings):
    """Define the infrastructure connections registered by a cloud deployment."""

    APPLICATION_DATABASE_URL: str

    model_config = SettingsConfigDict(extra="ignore")


async def seed_cloud(settings: CloudSeedSettings) -> None:
    """Register cloud infrastructure without creating local example data."""

    await seed_infrastructure(
        settings,
        compute_name="cloud compute",
        database_name="cloud database",
        storage_name="cloud storage",
    )


def main() -> None:
    """Seed either local example data or cloud infrastructure from a synchronous entrypoint."""

    parser = argparse.ArgumentParser()
    parser.add_argument("--cloud", action="store_true", help="register cloud infrastructure without local example data")
    arguments = parser.parse_args()
    if arguments.cloud:
        asyncio.run(seed_cloud(CloudSeedSettings()))
    else:
        asyncio.run(seed_local_development(SeedSettings()))


if __name__ == "__main__":
    main()

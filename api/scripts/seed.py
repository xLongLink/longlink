import asyncio
import argparse
from pathlib import Path
from pydantic import Field, field_validator
from sqlmodel import col
from src.utils import images
from contextlib import suppress
from sqlalchemy import select
from src.errors import ConflictError
from src.models.types import Image
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.models.computes import ComputeRegistryCreate
from src.database.session import session_scope
from src.database.services import users, compute, storage, solutions, organizations
from src.models.infrastructure import exoscale_zone
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


class SeedSettings(BaseSettings):
    """Define development infrastructure registrations."""

    # Compute registry
    KUBECONFIG: Path = Path(__file__).resolve().parents[1] / "kubeconfig.yaml"
    GATEWAY_URL: str = "https://localhost:8443"
    GATEWAY_CERTIFICATE: str | None = None
    DATABASE_SIZE_GIB: int = 10
    DATABASE_INSTANCES: int = 1
    DATABASE_STORAGE_CLASS: str = "local-path"

    # Sample release configuration
    SAMPLE_ENVS: dict[str, str] = Field(default_factory=lambda: {"REQUIRED": "development"})

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


async def seed_infrastructure(settings: SeedSettings, *, compute_name: str, storage_name: str) -> tuple[ComputeRegistry, StorageRegistry]:
    """Register the configured infrastructure and return its registries."""

    # Validate the configured Kubernetes compute before mutating Platform state.
    payload = ComputeRegistryCreate.model_validate(
        {
            "name": compute_name,
            "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8"),
            "gateway_url": settings.GATEWAY_URL,
            "gateway_certificate": settings.GATEWAY_CERTIFICATE,
            "database_storage_class": settings.DATABASE_STORAGE_CLASS,
            "database_size_gib": settings.DATABASE_SIZE_GIB,
            "database_instances": settings.DATABASE_INSTANCES,
        }
    )

    # Register the configured compute and queue its reconciliation when newly created.
    with suppress(ConflictError):
        async with session_scope() as session:
            await compute.create(session, **payload.model_dump())
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
        storage_registry = await session.scalar(select(StorageRegistry).where(col(StorageRegistry.name) == storage_name))
        if compute_registry is None or storage_registry is None:
            raise RuntimeError("Configured infrastructure is not available")
        return compute_registry, storage_registry


async def seed_local_development(settings: SeedSettings) -> None:
    """Register local infrastructure and create the local example Organization and Solution."""

    compute_registry, storage_registry = await seed_infrastructure(
        settings,
        compute_name="development compute",
        storage_name="local storage",
    )

    # The init workflow has no running API replica to create the administrator first.
    async with session_scope() as session:
        administrator = await users.ensure_administrator(session)

        organization = await session.scalar(select(Organization).where(col(Organization.slug) == "development"))
        if organization is None:
            organization = await organizations.create(
                session,
                "Development",
                administrator,
                compute_id=compute_registry.id,
                storage_id=storage_registry.id,
            )

        solution = await session.scalar(
            select(Solution).where(
                col(Solution.organization_id) == organization.id,
                col(Solution.slug) == "sample",
            )
        )
        if solution is None:
            # Pin the development registry image just like a hosted release snapshot.
            source = Image("localhost:15000/sample:dev")
            metadata = await images.metadata(source)
            if metadata is None:
                raise RuntimeError("Development image metadata not found")
            await solutions.create(
                session,
                organization.id,
                "Sample",
                metadata,
                settings.SAMPLE_ENVS,
                "A sample solution for local development.",
                user_id=administrator.id,
                source=source,
            )
        await session.commit()


class CloudSeedSettings(SeedSettings):
    """Define the infrastructure connections registered by a cloud deployment."""

    # Cloud infrastructure must choose its externally reachable gateway and durable storage class.
    GATEWAY_URL: str = Field(default="", min_length=1, validate_default=True)
    DATABASE_STORAGE_CLASS: str = Field(default="", min_length=1, validate_default=True)

    model_config = SettingsConfigDict(extra="ignore")


async def seed_cloud(settings: CloudSeedSettings) -> None:
    """Register cloud infrastructure without creating local example data."""

    await seed_infrastructure(
        settings,
        compute_name="cloud compute",
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

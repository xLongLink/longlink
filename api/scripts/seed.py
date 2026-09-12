import asyncio
import argparse
from pathlib import Path
from pydantic import Field
from sqlmodel import col
from src.utils import images
from contextlib import suppress
from sqlalchemy import select
from src.errors import ConflictError
from src.models.types import Image
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.models.computes import ComputeRegistryCreate
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import users, compute, solutions, organizations
from src.database.models.computes import ComputeRegistry
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

    # Shared Ceph storage; backing class must support raw Block PVCs and filesystem monitor PVCs.
    STORAGE_CLASS: str = "longlink-development"
    STORAGE_ENDPOINT: str = "https://rook-ceph-rgw-longlink.rook-ceph.svc:443"
    STORAGE_SIZE_GIB: int = 20
    STORAGE_INSTANCES: int = 1
    STORAGE_CERTIFICATE: str | None = None
    BUCKET_SIZE_BYTES: int = 1073741824
    BUCKET_MAX_OBJECTS: int = 10000
    STORAGE_RESERVE_PERCENT: int = 30
    STORAGE_OBJECT_OVERHEAD_BYTES: int = 65536

    model_config = SettingsConfigDict(
        env_file=".env.seed",
        env_file_encoding="utf-8",
        extra="ignore",
    )


async def seed_infrastructure(settings: SeedSettings, *, compute_name: str) -> ComputeRegistry:
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
            "storage_class": settings.STORAGE_CLASS,
            "storage_endpoint": settings.STORAGE_ENDPOINT,
            "storage_size_gib": settings.STORAGE_SIZE_GIB,
            "storage_instances": settings.STORAGE_INSTANCES,
            "storage_certificate": settings.STORAGE_CERTIFICATE,
            "bucket_size_bytes": settings.BUCKET_SIZE_BYTES,
            "bucket_max_objects": settings.BUCKET_MAX_OBJECTS,
            "storage_reserve_percent": settings.STORAGE_RESERVE_PERCENT,
            "storage_object_overhead_bytes": settings.STORAGE_OBJECT_OVERHEAD_BYTES,
        }
    )

    # Register the configured compute and queue its reconciliation when newly created.
    with suppress(ConflictError):
        async with session_scope() as session:
            await compute.create(session, payload)
            await session.commit()

    async with session_scope() as session:
        compute_registry = await session.scalar(select(ComputeRegistry).where(col(ComputeRegistry.name) == compute_name))
        if compute_registry is None:
            raise RuntimeError("Configured infrastructure is not available")
        return compute_registry


async def seed_local_development(settings: SeedSettings) -> None:
    """Register local infrastructure and create the local example Organization and Solution."""

    # Existing k3d clusters receive the same idempotent prerequisites as new local installations.
    if settings.STORAGE_CLASS == "longlink-development":
        from src.development import setup

        settings.STORAGE_CERTIFICATE = await setup.prepare(settings.KUBECONFIG)

    compute_registry = await seed_infrastructure(
        settings,
        compute_name="development compute",
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
            )

        solution = await session.scalar(
            select(Solution).where(
                col(Solution.organization_id) == organization.id,
                col(Solution.slug) == "sample",
            )
        )
        if solution is None or solution.status == Status.failed:
            # Pin the development registry image just like a hosted release snapshot.
            source = Image("localhost:15000/sample:dev")
            metadata = await images.metadata(source)
            if metadata is None:
                raise RuntimeError("Development image metadata not found")
            if solution is None:
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
            else:
                # Retry failed sample provisioning through a fresh immutable revision.
                solution = await solutions.access(session, solution.id, administrator.id)
                await solutions.deploy(session, solution, administrator.id, metadata, settings.SAMPLE_ENVS, source=source)
        await session.commit()


class CloudSeedSettings(SeedSettings):
    """Define the infrastructure connections registered by a cloud deployment."""

    # Cloud infrastructure must choose its externally reachable gateway and durable storage class.
    GATEWAY_URL: str = Field(default="", min_length=1, validate_default=True)
    DATABASE_STORAGE_CLASS: str = Field(default="", min_length=1, validate_default=True)
    STORAGE_INSTANCES: int = 3
    STORAGE_SIZE_GIB: int = 100
    STORAGE_CLASS: str = Field(default="", min_length=1, validate_default=True)
    BUCKET_SIZE_BYTES: int = Field(default=0, gt=0, validate_default=True)
    BUCKET_MAX_OBJECTS: int = Field(default=0, gt=0, validate_default=True)
    STORAGE_RESERVE_PERCENT: int = Field(default=0, gt=0, validate_default=True)
    STORAGE_OBJECT_OVERHEAD_BYTES: int = Field(default=0, gt=0, validate_default=True)

    model_config = SettingsConfigDict(extra="ignore")


async def seed_cloud(settings: CloudSeedSettings) -> None:
    """Register cloud infrastructure without creating local example data."""

    await seed_infrastructure(
        settings,
        compute_name="cloud compute",
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

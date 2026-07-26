import secrets
from uuid import UUID, uuid4
from sqlmodel import col
from sqlalchemy import update
from dataclasses import dataclass
from src.environments import env
from src.models.types import StorageKind, DatabaseSSLMode
from src.models.statuses import ComputeStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class Infrastructure:
    """Hold one test compute, database, and storage registry assignment."""

    compute: ComputeRegistry
    database: DatabaseRegistry
    storage: StorageRegistry


async def create_ready_infrastructure(
    owner: User,
    slug: str = "local",
    name: str = "Local testing",
) -> Infrastructure:
    """Create independent registries with a ready compute target and no provider side effects."""

    # Test setup persists the exact assignable registry shape while avoiding provider side effects.
    async with session_scope() as session:
        suffix = uuid4().hex[:8]
        compute = ComputeRegistry(
            name=f"{name} compute {suffix}",
            slug=f"{slug}-{suffix}-compute",
            kubeconfig="apiVersion: v1\nclusters: []\n",
            gateway_url="https://gateway.example",
            gateway_ca_certificate="test-ca",
            proxy_secret=secrets.token_urlsafe(32),
            status=ComputeStatus.ready,
            version=env.VERSION,
            created_id=owner.id,
            updated_id=owner.id,
        )
        database = DatabaseRegistry(
            name=f"{name} database {suffix}",
            slug=f"{slug}-{suffix}-database",
            host="database.example",
            port=5432,
            username="admin",
            password="secret",
            sslmode=DatabaseSSLMode.disable,
            created_id=owner.id,
            updated_id=owner.id,
        )
        storage = StorageRegistry(
            kind=StorageKind.exoscale,
            name=f"{name} storage {suffix}",
            slug=f"{slug}-{suffix}-storage",
            endpoint_url="https://sos-ch-gva-2.exo.io",
            runtime_endpoint_url="https://sos-ch-gva-2.exo.io",
            access_key_id="access-key",
            secret_access_key="secret-key",
            created_id=owner.id,
            updated_id=owner.id,
        )
        session.add_all([compute, database, storage])
        await session.commit()
        return Infrastructure(compute=compute, database=database, storage=storage)


async def create_organization(
    infrastructure: Infrastructure,
    owner: User,
    name: str = "acme",
    slug: str = "acme",
    avatar: str | None = None,
    organization_id: UUID | None = None,
) -> Organization:
    """Create one Organization through the service using a complete infrastructure assignment."""

    # Import lazily so tests can share this factory without introducing service import cycles.
    from src.database.services import organizations

    organization, _ = await organizations.create(
        name,
        slug,
        infrastructure.compute.id,
        infrastructure.database.id,
        infrastructure.storage.id,
        owner,
        avatar=avatar,
        organization_id=organization_id,
    )
    return organization


async def mark_organization_running(organization: Organization) -> None:
    """Mark one service-created Organization ready for Application tests."""

    # Organization Application creation is valid only after runtime reconciliation succeeds.
    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=OrganizationStatus.running))
        await session.commit()


async def create_application(
    organization: Organization,
    owner: User,
    name: str = "dashboard",
    slug: str = "dashboard",
    image: str = "ghcr.io/longlink/dashboard:latest",
    description: str | None = None,
    icon: str | None = None,
) -> Application:
    """Create one Application after making its Organization ready."""

    # Import lazily so tests can share this factory without introducing service import cycles.
    from src.database.services import applications

    # Application creation requires the parent Organization to be running.
    await mark_organization_running(organization)
    application, _ = await applications.create(
        organization.id,
        name,
        slug=slug,
        image=image,
        description=description,
        icon=icon,
        user=owner,
    )
    return application

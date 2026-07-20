import secrets
from uuid import UUID, uuid4
from dataclasses import dataclass
from src.environments import env
from src.models.types import StorageKind
from src.models.statuses import ComputeStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
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
            created_id=owner.id,
            updated_id=owner.id,
        )
        storage = StorageRegistry(
            kind=StorageKind.minio,
            name=f"{name} storage {suffix}",
            slug=f"{slug}-{suffix}-storage",
            endpoint_url="http://storage.example",
            runtime_endpoint_url="http://storage.internal",
            access_key_id="access-key",
            secret_access_key="secret-key",
            created_id=owner.id,
            updated_id=owner.id,
        )
        session.add_all([compute, database, storage])
        await session.commit()
        await session.refresh(compute)
        await session.refresh(database)
        await session.refresh(storage)
        return Infrastructure(compute=compute, database=database, storage=storage)


async def create_organization(
    infrastructure: Infrastructure,
    owner: User,
    name: str = "acme",
    slug: str = "acme",
    avatar: str | None = None,
    country: str = "CH",
    organization_id: UUID | None = None,
) -> Organization:
    """Create one Organization through the service using a complete infrastructure assignment."""

    # Import lazily so tests can share this factory without introducing service import cycles.
    from src.database.services import organizations

    return await organizations.create(
        name,
        slug,
        infrastructure.compute.id,
        infrastructure.database.id,
        infrastructure.storage.id,
        owner,
        avatar=avatar,
        country=country,
        organization_id=organization_id,
    )


async def mark_organization_running(organization: Organization) -> Organization:
    """Mark one service-created Organization ready for Application tests."""

    # Organization Application creation is valid only after runtime reconciliation succeeds.
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        if persisted is None:
            raise RuntimeError("Test Organization not found")
        persisted.status = OrganizationStatus.running
        await session.commit()
        await session.refresh(persisted)
        return persisted

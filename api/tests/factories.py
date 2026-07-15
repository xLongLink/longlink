import secrets
from uuid import uuid4
from src.environments import env
from src.models.statuses import LocationStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.models.users import User
from src.models.infrastructure import StorageKind, DatabaseKind
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.locations import Location
from src.database.models.organizations import Organization


async def create_ready_location(
    owner: User,
    slug: str = "local",
    name: str = "Local testing",
    country: str = "CH",
) -> Location:
    """Create one complete ready location aggregate without external reconciliation."""

    # Test setup persists the exact aggregate shape while avoiding provider side effects.
    async with session_scope() as session:
        suffix = uuid4().hex[:8]
        location = Location(
            name=name,
            slug=slug,
            country=country,
            status=LocationStatus.ready,
            version=env.VERSION,
            created_id=owner.id,
            updated_id=owner.id,
        )
        session.add(location)
        session.add_all(
            [
                ComputeRegistry(
                    name=f"{slug}-{suffix} compute",
                    slug=f"{slug}-{suffix}-compute",
                    kubeconfig="apiVersion: v1\nclusters: []\n",
                    gateway_url="https://gateway.example",
                    gateway_ca_certificate="test-ca",
                    proxy_secret=secrets.token_urlsafe(32),
                    location_id=location.id,
                    created_id=owner.id,
                    updated_id=owner.id,
                ),
                DatabaseRegistry(
                    kind=DatabaseKind.postgresql,
                    name=f"{slug}-{suffix} database",
                    slug=f"{slug}-{suffix}-database",
                    host="database.example",
                    port=5432,
                    username="admin",
                    password="secret",
                    location_id=location.id,
                    created_id=owner.id,
                    updated_id=owner.id,
                ),
                StorageRegistry(
                    kind=StorageKind.minio,
                    name=f"{slug}-{suffix} storage",
                    slug=f"{slug}-{suffix}-storage",
                    endpoint_url="http://storage.example",
                    runtime_endpoint_url="http://storage.internal",
                    access_key_id="access-key",
                    secret_access_key="secret-key",
                    location_id=location.id,
                    created_id=owner.id,
                    updated_id=owner.id,
                ),
            ]
        )
        await session.commit()
        await session.refresh(location)
        return location


async def mark_organization_running(organization: Organization) -> Organization:
    """Mark one service-created organization ready for application tests."""

    # Organization application creation is valid only after runtime reconciliation succeeds.
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        if persisted is None:
            raise RuntimeError("Test organization not found")
        persisted.status = OrganizationStatus.running
        await session.commit()
        await session.refresh(persisted)
        return persisted

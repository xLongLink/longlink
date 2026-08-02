from uuid import UUID, uuid4
from sqlmodel import col
from sqlalchemy import update
from dataclasses import dataclass
from src.environments import env
from src.models.types import Image, DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations, applications, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


@dataclass(frozen=True, slots=True)
class Infrastructure:
    """Hold one test compute, database, and storage registry assignment."""

    compute: ComputeRegistry
    database: DatabaseRegistry
    storage: StorageRegistry


async def queue_operation(compute_id: UUID, *, kind: OperationKind = OperationKind.compute_create, target_id: UUID) -> Operation:
    """Queue one standalone Operation through an explicit test transaction."""

    # Tests without a resource command transaction commit their queued work here.
    async with session_scope() as session:
        operation = await operations.enqueue(session, compute_id, kind=kind, target_id=target_id)
        await session.commit()
        return operation


async def create_compute(name: str = "Local compute") -> ComputeRegistry:
    """Create one minimal Compute registry without queueing reconciliation."""

    # Operation tests need a persisted Compute target without registry service side effects.
    async with session_scope() as session:
        compute = ComputeRegistry(
            name=name,
            kubeconfig={"apiVersion": "v1", "clusters": []},
            version=env.VERSION,
        )
        session.add(compute)
        await session.commit()
        return compute


async def create_ready_infrastructure(name: str = "Local testing") -> Infrastructure:
    """Create independent registries with a ready compute target and no provider side effects."""

    # Test setup persists the exact assignable registry shape while avoiding provider side effects.
    async with session_scope() as session:
        suffix = uuid4().hex[:8]
        compute = ComputeRegistry(
            name=f"{name} compute {suffix}",
            kubeconfig={"apiVersion": "v1", "clusters": []},
            gateway_url="https://gateway.example",
            gateway_api_key="test-api-key",
            gateway_certificate="test-certificate",
            status=Status.running,
            version=env.VERSION,
        )
        database = DatabaseRegistry(
            name=f"{name} database {suffix}",
            host="database.example",
            port=5432,
            username="admin",
            password="secret",
            sslmode=DatabaseSSLMode.disable,
        )
        storage = StorageRegistry(
            name=f"{name} storage {suffix}",
            endpoint_url="https://sos-ch-gva-2.exo.io",
            access_key_id="access-key",
            secret_access_key="secret-key",
        )
        session.add_all([compute, database, storage])
        await session.commit()
        return Infrastructure(compute=compute, database=database, storage=storage)


async def create_organization(
    owner: User,
    name: str = "acme",
    slug: str = "acme",
    avatar: str | None = None,
    infrastructure: Infrastructure | None = None,
) -> Organization:
    """Create one Organization with the specified or independent ready infrastructure."""

    if infrastructure is None:
        infrastructure = await create_ready_infrastructure()

    return await organizations.create(
        name,
        slug,
        owner,
        avatar=avatar,
        compute_id=infrastructure.compute.id,
        storage_id=infrastructure.storage.id,
        database_id=infrastructure.database.id,
    )


async def create_application(
    organization: Organization,
    owner: User,
    name: str = "dashboard",
    slug: str = "dashboard",
    image: str = "ghcr.io/longlink/dashboard:latest",
) -> Application:
    """Create one Application after making its Organization ready."""

    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
        await session.commit()
    parsed_image = Image(image)
    resolved_image = image if "@" in image else f"{parsed_image.registry}/{parsed_image.repository}@sha256:test"
    return await applications.create(
        organization.id,
        name,
        slug=slug,
        image=resolved_image,
        user=owner,
    )

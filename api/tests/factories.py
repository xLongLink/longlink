import secrets
from uuid import uuid4
from sqlmodel import col
from sqlalchemy import update
from dataclasses import dataclass
from src.environments import env
from src.models.types import Image, DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationKind
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


async def create_ready_infrastructure(name: str = "Local testing") -> Infrastructure:
    """Create independent registries with a ready compute target and no provider side effects."""

    # Test setup persists the exact assignable registry shape while avoiding provider side effects.
    async with session_scope() as session:
        suffix = uuid4().hex[:8]
        compute = ComputeRegistry(
            name=f"{name} compute {suffix}",
            kubeconfig={"apiVersion": "v1", "clusters": []},
            gateway_url="https://gateway.example",
            gateway_ca_certificate="test-ca",
            gateway_tls_certificate="test-certificate",
            gateway_tls_private_key="test-private-key",
            proxy_secret=secrets.token_urlsafe(32),
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


async def create_organization(owner: User, name: str = "acme", slug: str = "acme", avatar: str | None = None) -> Organization:
    """Create one Organization through automatic infrastructure assignment."""

    # Import lazily so tests can share this factory without introducing service import cycles.
    from src.database.services import operations, organizations

    organization = await organizations.create(name, slug, owner, avatar=avatar)
    await operations.create(
        organization.compute_id,
        kind=OperationKind.organization_create,
        target_id=organization.id,
    )
    return organization


async def mark_organization_running(organization: Organization) -> None:
    """Mark one service-created Organization ready for Application tests."""

    # Organization Application creation is valid only after runtime reconciliation succeeds.
    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
        await session.commit()


async def create_application(
    organization: Organization,
    owner: User,
    name: str = "dashboard",
    slug: str = "dashboard",
    image: str = "ghcr.io/longlink/dashboard:latest",
    digest: str = "sha256:test",
    description: str | None = None,
    icon: str | None = None,
) -> Application:
    """Create one Application after making its Organization ready."""

    # Import lazily so tests can share this factory without introducing service import cycles.
    from src.database.services import operations, applications

    # Application creation requires the parent Organization to be running.
    await mark_organization_running(organization)
    parsed_image = Image(image)
    resolved_image = image if "@" in image else f"{parsed_image.registry}/{parsed_image.repository}@{digest}"
    application = await applications.create(
        organization.id,
        name,
        slug=slug,
        image=resolved_image,
        description=description,
        icon=icon,
        user=owner,
    )
    await operations.create(
        organization.compute_id,
        kind=OperationKind.application_create,
        target_id=application.id,
        delay_seconds=30,
    )
    return application

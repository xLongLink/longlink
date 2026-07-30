import asyncio
import subprocess
from uuid import UUID
from pathlib import Path
from datetime import timedelta
from pydantic import Field, field_validator
from sqlmodel import col
from src.utils import jobs, names, images
from sqlalchemy import select, update
from sqlalchemy.exc import ArgumentError
from src.operations import handlers
from src.models.roles import OrganizationRoles
from src.models.types import DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from longlink.utils.time import utcnow
from src.models.computes import ComputeRegistryCreate, kubeconfig_mapping
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import users as user_service
from src.database.services import compute as compute_service
from src.database.services import storage as storage_service
from src.database.services import database as database_service
from src.database.services import operations
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.kubernetes.client import Kubernetes
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.models.infrastructure import DatabaseConfiguration, exoscale_zone
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization
from src.database.models.applications import Application

SEED_OPERATION_DELAY_SECONDS = 315360000


class SeedSettings(BaseSettings):
    """Define credentials required only while seeding development."""

    # Local Organization and Application
    LOCAL_ORG: str = Field(default="test", min_length=1)
    LOCAL_APP_NAME: str = Field(default="sample", min_length=1)
    LOCAL_ORG_AVATAR: str = Field(default="https://example.com/organizations/test.png", min_length=1)
    APPLICATION_IMAGE: str = Field(default="localhost:15000/longlink-app:dev", min_length=1)

    # Local infrastructure
    KUBECONFIG: Path = Path(__file__).with_name("kubeconfig.yaml")
    LOCAL_DATABASE_PORT: int = Field(default=15432, ge=1, le=65535)
    LOCAL_DOCKER_NETWORK: str = Field(default="longlink-dev", min_length=1)

    # Application database registry
    APPLICATION_DATABASE_URL: str | None = None

    # Exoscale storage
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


async def ensure_local_organization_owner(organization_id: UUID, user_id: UUID) -> bool:
    """Grant local administrator ownership and report whether shared Organization state changed."""

    # Local reseeding repairs only Platform membership metadata.
    async with session_scope() as session:
        membership = await session.get(UserOrganization, {"organization_id": organization_id, "user_id": user_id})
        if membership is None:
            session.add(
                UserOrganization(
                    user_id=user_id,
                    organization_id=organization_id,
                    role=OrganizationRoles.owner,
                    created_id=user_id,
                    updated_id=user_id,
                )
            )
        else:
            if membership.role == OrganizationRoles.owner and membership.deleted_at is None and membership.deleted_id is None:
                return False
            membership.role = OrganizationRoles.owner
            membership.deleted_at = None
            membership.deleted_id = None
            membership.updated_at = utcnow()
            membership.updated_id = user_id
        await session.commit()
        return True


async def reconcile_local_application(
    application_id: UUID,
    compute_id: UUID,
    payload: ApplicationCreate,
    metadata: LongLinkMetadata,
    user_id: UUID,
) -> tuple[Application, Operation | None] | None:
    """Reconcile one existing seeded Application and queue deployment when needed."""

    # Lock the compute aggregate before changing Application desired state or its Operation queue.
    async with session_scope() as session:
        connection = await session.connection()
        if connection.dialect.name == "sqlite":
            await session.execute(
                update(ComputeRegistry).where(col(ComputeRegistry.id) == compute_id).values(id=compute_id)
            )
        compute = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        application = await session.get(Application, application_id, with_for_update=True)
        if compute is None or application is None or application.deleted_at is not None:
            return None

        # Compare mutable seed metadata before deciding whether lifecycle work is needed.
        changed = (
            application.name != payload.name
            or application.icon != payload.icon
            or application.image != metadata.image
            or application.sdk != metadata.sdk
            or application.version != metadata.version
            or application.description != payload.description
        )

        # Running Applications with unchanged desired state need no lifecycle work.
        if not changed and application.status not in {Status.creating, Status.failed}:
            return application, None

        # Lock unfinished work before changing desired state so a scheduler cannot deploy stale values concurrently.
        now = utcnow()
        pending_operations = list(
            await session.scalars(
                select(Operation)
                .where(
                    col(Operation.kind) == OperationKind.application_create,
                    col(Operation.target_id) == application.id,
                    col(Operation.finished_at).is_(None),
                )
                .with_for_update()
            )
        )
        if any(operation.lease_expires_at is not None and operation.lease_expires_at > now for operation in pending_operations):
            raise RuntimeError("Local Application deployment is already active; retry seeding after it completes")

        # Hold every reusable unleased Operation until seed explicitly schedules it after Secret staging.
        staged_at = now + timedelta(seconds=SEED_OPERATION_DELAY_SECONDS)
        for operation in pending_operations:
            if operation.lease_expires_at is None:
                operation.available_at = staged_at

        # Replace mutable seed metadata when the selected image or local presentation changed.
        if changed:
            application.name = payload.name
            application.icon = payload.icon
            application.image = metadata.image
            application.sdk = metadata.sdk
            application.version = metadata.version
            application.description = payload.description
            application.status = Status.creating
            application.updated_at = now
            application.updated_id = user_id

        await session.commit()

    operation = await operations.create(
        compute_id,
        kind=OperationKind.application_create,
        target_id=application_id,
        delay_seconds=SEED_OPERATION_DELAY_SECONDS,
    )
    return application, operation


async def reconcile_until_complete(operation_id: UUID) -> None:
    """Drain the durable queue until the target Operation succeeds or fails."""

    # The seed process has no lifespan worker, so it drains the same durable queue explicitly.
    while True:
        operation = await operations.claim()
        if operation is None:
            await asyncio.sleep(1)
            continue
        result = await jobs.execute(operation, handlers[operation.kind])
        if result.id != operation_id:
            continue
        if result.finished_at is not None:
            if result.failed:
                raise RuntimeError(f"Operation {result.id} failed; see the Platform logs")
            return
        await asyncio.sleep(1)


async def seed_local_development(settings: SeedSettings) -> None:
    """Create or repair local infrastructure, Organization, and sample Application desired state."""

    # Validate Application configuration before mutating local Platform state.
    payload = ApplicationCreate.model_validate(
        {
            "name": settings.LOCAL_APP_NAME,
            "image": settings.APPLICATION_IMAGE,
            "description": "Local SDK development application",
            "envs": {"REQUIRED": "local-development"},
        }
    )
    application_slug = names.slugify(payload.name)

    # Local registry images can only be pulled by the compute cluster created by make local.
    local_kubeconfig = Path(__file__).with_name("kubeconfig.yaml").resolve()
    if str(payload.image).startswith("localhost:") and settings.KUBECONFIG.resolve() != local_kubeconfig:
        raise ValueError("Local Application image requires the compute kubeconfig created by make local")

    # Validate the selected Kubernetes compute target before external lookups or Platform mutations.
    compute = ComputeRegistryCreate(
        name="development compute",
        kubeconfig=kubeconfig_mapping(settings.KUBECONFIG.read_text(encoding="utf-8")),
    )

    # Resolve and validate immutable image metadata before mutating local Platform state.
    metadata = await images.metadata(payload.image)
    if metadata is None or metadata.digest is None:
        raise ValueError("Local Application image metadata not found")
    missing_envs = images.missing_envs(metadata, payload.envs)
    if missing_envs:
        raise ValueError(f"Local Application environment is missing required image variables: {', '.join(missing_envs)}")

    # Resolve either the configured remote Application database registry or the local PostgreSQL service.
    if settings.APPLICATION_DATABASE_URL is None:
        database = DatabaseConfiguration(
            host=local_database_host(settings),
            port=settings.LOCAL_DATABASE_PORT,
            username="admin",
            password="admin",
            sslmode=DatabaseSSLMode.disable,
        )
    else:
        try:
            database_url = make_url(settings.APPLICATION_DATABASE_URL)
            database_port = database_url.port or 5432
        except (ArgumentError, ValueError):
            raise ValueError("Application database URL is invalid") from None
        if database_url.get_backend_name() != "postgresql":
            raise ValueError("Application database URL must use PostgreSQL")
        if set(database_url.query) - {"sslmode"}:
            raise ValueError("Application database URL only supports the sslmode query option")
        sslmode = database_url.query.get("sslmode", DatabaseSSLMode.require.value)
        try:
            database = DatabaseConfiguration.model_validate(
                {
                    "host": database_url.host or "",
                    "port": database_port,
                    "username": database_url.username or "",
                    "password": database_url.password or "",
                    "sslmode": sslmode,
                }
            )
        except ValueError:
            raise ValueError("Application database URL has invalid connection settings") from None

    # Reject registry changes before mutating existing local Platform state.
    database_registry = next((item for item in await database_service.fetch() if item.name == "development database"), None)
    if database_registry is not None and (
        database_registry.host != database.host
        or database_registry.port != database.port
        or database_registry.username != database.username
        or database_registry.password != database.password
        or database_registry.sslmode != database.sslmode
    ):
        raise ValueError("Development database registry uses different settings; run make down before changing them")

    # Reject compute changes because gateway identity and Organization assignments are bound to one cluster.
    compute_registry = next((item for item in await compute_service.fetch() if item.name == "development compute"), None)
    if compute_registry is not None and compute_registry.kubeconfig != compute.kubeconfig:
        raise ValueError("Development compute registry uses a different kubeconfig; run make down before changing it")

    # Require the Platform lifespan to initialize the configured administrator before seeding resources.
    admin = await user_service.administrator()
    if admin is None:
        raise RuntimeError("Configured Platform administrator does not exist; start the Platform API before seeding")

    # Ensure the development compute target is ready before assigning resources to it.
    if compute_registry is None:
        compute_registry = await compute_service.create(
            "development compute", compute.kubeconfig
        )
        operation = await operations.create(compute_registry.id)
        await reconcile_until_complete(operation.id)
    elif compute_registry.status != Status.running:
        operation = await operations.create(compute_registry.id)
        await reconcile_until_complete(operation.id)

    # Register the development database and storage backends independently.
    if database_registry is None:
        database_registry = await database_service.create(
            "development database",
            database.host,
            database.port,
            database.username,
            database.password,
            database.sslmode,
        )
    storage_registry = next((item for item in await storage_service.fetch() if item.name == "local storage"), None)
    if storage_registry is None:
        storage_registry = await storage_service.create(
            "local storage",
            settings.EXOSCALE_STORAGE_ENDPOINT_URL,
            settings.EXOSCALE_API_KEY,
            settings.EXOSCALE_API_SECRET,
        )
    elif (
        storage_registry.endpoint_url != settings.EXOSCALE_STORAGE_ENDPOINT_URL
        or storage_registry.access_key_id != settings.EXOSCALE_API_KEY
        or storage_registry.secret_access_key != settings.EXOSCALE_API_SECRET
    ):
        raise ValueError("Local storage registry uses different Exoscale settings; run make down before changing them")

    # Create the local Organization or restore its administrator ownership.
    organization = next((item for item in await organization_service.fetch() if item.slug == settings.LOCAL_ORG), None)
    if organization is None:
        organization = await organization_service.create(
            settings.LOCAL_ORG, settings.LOCAL_ORG, admin, avatar=settings.LOCAL_ORG_AVATAR
        )
        operation = await operations.create(
            compute_registry.id,
            kind=OperationKind.organization_create,
            target_id=organization.id,
        )
        await reconcile_until_complete(operation.id)
    else:
        owner_changed = await ensure_local_organization_owner(organization.id, admin.id)
        if owner_changed:
            operation = await operations.create(
                compute_registry.id,
                kind=OperationKind.organization_create,
                target_id=organization.id,
            )
            await reconcile_until_complete(operation.id)

    # Create or resume the sample Application through the API desired-state service.
    application = next((item for item in await organization_service.applications(organization.id) if item.slug == application_slug), None)
    if application is None:
        application = await application_service.create(
            organization.id,
            payload.name,
            application_slug,
            metadata.image,
            admin,
            sdk=metadata.sdk,
            version=metadata.version,
            description=payload.description,
            icon=payload.icon,
        )
        operation = await operations.create(
            compute_registry.id,
            kind=OperationKind.application_create,
            target_id=application.id,
            delay_seconds=SEED_OPERATION_DELAY_SECONDS,
        )
    else:
        reconciled = await reconcile_local_application(
            application.id,
            compute_registry.id,
            payload,
            metadata,
            admin.id,
        )
        if reconciled is None:
            raise RuntimeError("Local Application is no longer available")
        application, operation = reconciled
        if operation is None:
            return

    # Stage local user values once before releasing new Application lifecycle work.
    cluster = Kubernetes(compute_registry.kubeconfig)
    await cluster.applications.stage_envs(application.id, organization.slug, payload.envs)

    # Remove staged resources when concurrent deletion won after the desired-state transaction committed.
    current = await application_service.get(application.id, include_deleted=True)
    if current is None or current.deleted_at is not None:
        await cluster.applications.delete(application.id, organization.slug)
        raise RuntimeError("Local Application was deleted while seed values were staged")

    if not await operations.schedule_now(operation.id):
        raise RuntimeError("Local Application create Operation is no longer open")
    await reconcile_until_complete(operation.id)


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    # Load the configured development resources before seeding them.
    settings = SeedSettings()
    asyncio.run(seed_local_development(settings))


if __name__ == "__main__":
    main()

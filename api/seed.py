import asyncio
import argparse
import subprocess
from src import adapters
from uuid import UUID
from pwdlib import PasswordHash
from pathlib import Path
from pydantic import Field, field_validator
from sqlmodel import col
from src.utils import jobs, names, images
from sqlalchemy import text, select, inspect
from sqlalchemy.exc import ArgumentError
from src.operations import computes as _operation_computes
from src.operations import applications as _operation_applications
from src.operations import organizations as _operation_organizations
from src.environments import env
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.types import Image, DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from longlink.utils.time import utcnow
from src.models.computes import ComputeRegistryCreate
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute as compute_service
from src.database.services import storage as storage_service
from src.database.services import database as database_service
from src.database.services import operations
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.kubernetes.client import Kubernetes
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.models.infrastructure import DatabaseConfiguration, exoscale_zone
from src.database.models.association import UserOrganization


class SeedSettings(BaseSettings):
    """Define credentials required only while seeding development."""

    # Local administrator
    LOCAL_ADMIN_NAME: str = Field(default="Example LongLink", min_length=1)
    LOCAL_ADMIN_EMAIL: str = Field(default="example@longlink.dev", min_length=1)
    LOCAL_ADMIN_PASSWORD: str = Field(default="longlink-admin", min_length=1)

    # Local Organization and Application
    LOCAL_ORG: str = Field(default="test", min_length=1)
    LOCAL_APP_NAME: str = Field(default="sample", min_length=1)
    LOCAL_ORG_AVATAR: str = Field(default="https://example.com/organizations/test.png", min_length=1)
    LOCAL_APPLICATION_IMAGE: str = Field(default="localhost:15000/longlink-app:dev", min_length=1)

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
        env_file=(".env.seed", ".env"),
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


async def seed_local_administrator(settings: SeedSettings) -> tuple[User, bool]:
    """Create or repair the local administrator and report shared user changes."""

    # Create the local account or repair its development credentials and role.
    hasher = PasswordHash.recommended()
    async with session_scope() as session:
        result = await session.execute(select(User).where(col(User.email) == settings.LOCAL_ADMIN_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=settings.LOCAL_ADMIN_EMAIL,
                hashed_password=hasher.hash(settings.LOCAL_ADMIN_PASSWORD),
            )
            session.add(user)
            user_changed = True
        else:
            verified = hasher.verify(settings.LOCAL_ADMIN_PASSWORD, user.hashed_password)
            user_changed = (
                not verified
                or user.name != settings.LOCAL_ADMIN_NAME
                or user.role != PlatformRoles.administrator
                or user.deleted_at is not None
            )
            if not verified:
                user.hashed_password = hasher.hash(settings.LOCAL_ADMIN_PASSWORD)

        user.name = settings.LOCAL_ADMIN_NAME
        user.role = PlatformRoles.administrator
        user.deleted_at = None

        await session.commit()
        return user, user_changed


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


async def reconcile_until_complete(operation_id: UUID) -> None:
    """Drain the durable queue until the target Operation succeeds or fails."""

    # The seed process has no lifespan worker, so it drains the same durable queue explicitly.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue
        result = await jobs.execute(operation, jobs.handlers[operation.kind])
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
    payload = ApplicationCreate(
        name=settings.LOCAL_APP_NAME,
        image=Image(settings.LOCAL_APPLICATION_IMAGE),
        description="Local SDK development application",
        envs={"REQUIRED": "local-development"},
    )
    application_slug = names.slugify(payload.name)

    # Validate the selected Kubernetes compute target before external lookups or Platform mutations.
    compute = ComputeRegistryCreate(
        name="development compute",
        kubeconfig=settings.KUBECONFIG.read_text(encoding="utf-8"),
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
        if not isinstance(sslmode, str):
            raise ValueError("Application database URL must define one sslmode value")
        try:
            database = DatabaseConfiguration(
                host=database_url.host or "",
                port=database_port,
                username=database_url.username or "",
                password=database_url.password or "",
                sslmode=DatabaseSSLMode(sslmode),
            )
        except ValueError:
            raise ValueError("Application database URL has invalid connection settings") from None

    # Reject registry changes before mutating existing local Platform state.
    database_registry = next((item for item in await database_service.fetch() if item.slug == "local-database"), None)
    if database_registry is not None and (
        database_registry.host != database.host
        or database_registry.port != database.port
        or database_registry.username != database.username
        or database_registry.password != database.password
        or database_registry.sslmode != database.sslmode
    ):
        raise ValueError("Development database registry uses different settings; run make down before changing them")

    # Reject compute changes because gateway identity and Organization assignments are bound to one cluster.
    compute_registry = next((item for item in await compute_service.fetch() if item.slug == "local-compute"), None)
    if compute_registry is not None and compute_registry.kubeconfig != compute.kubeconfig:
        raise ValueError("Development compute registry uses a different kubeconfig; run make down before changing it")

    # Create or restore the local Platform administrator.
    admin, administrator_changed = await seed_local_administrator(settings)

    # Ensure the development compute target is ready before assigning resources to it.
    if compute_registry is None:
        compute_registry, operation = await compute_service.create(
            compute.name,
            "local-compute",
            compute.kubeconfig,
        )
        await reconcile_until_complete(operation.id)
    elif compute_registry.status != Status.running:
        operation = await operations.enqueue(compute_registry.id)
        await reconcile_until_complete(operation.id)

    # Register the development database and storage backends independently.
    if database_registry is None:
        database_registry = await database_service.create(
            "development database",
            "local-database",
            database.host,
            database.port,
            database.username,
            database.password,
            database.sslmode,
        )
    storage_registry = next((item for item in await storage_service.fetch() if item.slug == "local-storage"), None)
    if storage_registry is None:
        storage_registry = await storage_service.create(
            "local storage",
            "local-storage",
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
        organization, operation = await organization_service.create(
            settings.LOCAL_ORG, settings.LOCAL_ORG, admin, avatar=settings.LOCAL_ORG_AVATAR
        )
        await reconcile_until_complete(operation.id)
    else:
        owner_changed = await ensure_local_organization_owner(organization.id, admin.id)
        if administrator_changed or owner_changed:
            operation = await operations.enqueue(
                compute_registry.id,
                kind=OperationKind.organization_reconcile,
                target_id=organization.id,
            )
            await reconcile_until_complete(operation.id)

    # Create or resume the sample Application through the API desired-state service.
    application = next((item for item in await organization_service.applications(organization.id) if item.slug == application_slug), None)
    created = application is None
    if created:
        application, operation = await application_service.create(
            organization.id,
            payload.name,
            application_slug,
            metadata.image,
            admin,
            digest=metadata.digest,
            sdk=metadata.sdk,
            version=metadata.version,
            description=payload.description,
            icon=payload.icon.value if payload.icon is not None else None,
        )
    elif application.status in {Status.creating, Status.failed}:
        operation = await operations.enqueue(
            compute_registry.id,
            kind=OperationKind.application_create,
            target_id=application.id,
        )
    else:
        return

    # Stage local user values once before releasing new Application lifecycle work.
    cluster = Kubernetes(compute_registry.kubeconfig)
    if created:
        await cluster.applications.stage_envs(application.id, organization.slug, payload.envs)
    operation = await operations.schedule_now(operation.id)
    if operation is None:
        raise RuntimeError("Local Application create Operation is no longer open")
    await reconcile_until_complete(operation.id)


async def cleanup_local_development() -> None:
    """Delete Exoscale resources tracked by local Platform state."""

    # Avoid creating a new SQLite database when local development has no persisted state.
    database_url = make_url(env.DATABASE_URL)
    database_name = database_url.database
    if database_url.get_backend_name() == "sqlite" and database_name is not None and database_name not in {"", ":memory:"}:
        database_path = Path(database_name).resolve()
        if not database_path.is_file():
            print("No local Platform state requires cleanup.")
            return

    # Inventory every Exoscale resource before make removes the local database.
    async with session_scope() as session:
        connection = await session.connection()
        tables = await connection.run_sync(lambda sync_connection: inspect(sync_connection).get_table_names())
        if not {"applications", "organizations", "storage_registries"}.issubset(tables):
            print("No Exoscale development resources require cleanup.")
            return
        result = await session.execute(
            text(
                """
                SELECT storage_registries.endpoint_url,
                       storage_registries.access_key_id,
                       storage_registries.secret_access_key,
                       organizations.id,
                       applications.id
                FROM organizations
                JOIN storage_registries ON storage_registries.id = organizations.storage_id
                LEFT JOIN applications ON applications.organization_id = organizations.id
                """
            )
        )
        resources: dict[tuple[str, str, str, UUID], set[UUID]] = {}
        for endpoint_url, access_key_id, secret_access_key, organization_id, application_id in result:
            key = (
                str(endpoint_url),
                str(access_key_id),
                str(secret_access_key),
                UUID(str(organization_id)),
            )
            applications = resources.setdefault(key, set())
            if application_id is not None:
                applications.add(UUID(str(application_id)))

    if not resources:
        print("No Exoscale development resources require cleanup.")
        return

    # Remove scoped credentials before emptying and deleting each Organization bucket.
    for (
        endpoint_url,
        access_key_id,
        secret_access_key,
        organization_id,
    ), application_ids in resources.items():
        storage = adapters.Exoscale(endpoint_url, access_key_id, secret_access_key)
        for application_id in application_ids:
            await storage.revoke(application_id.hex)
        await storage.delete(organization_id.hex)

    print(f"Removed Exoscale resources for {len(resources)} development Organizations.")


def main() -> None:
    """Seed or clean local development resources from a synchronous entrypoint."""

    # Cleanup removes remote resources before make deletes their local inventory.
    parser = argparse.ArgumentParser()
    parser.add_argument("--cleanup", action="store_true")
    arguments = parser.parse_args()
    if arguments.cleanup:
        asyncio.run(cleanup_local_development())
        return

    settings = SeedSettings(**{})
    asyncio.run(seed_local_development(settings))
    print(f"Local administrator: {settings.LOCAL_ADMIN_EMAIL} / {settings.LOCAL_ADMIN_PASSWORD}")


if __name__ == "__main__":
    main()

import asyncio
import argparse
import subprocess
from src import adapters
from uuid import UUID
from pathlib import Path
from pydantic import Field, field_validator
from sqlmodel import col
from src.utils import jobs, names, passwords
from sqlalchemy import text, select, inspect
from src.operations import computes as operation_computes
from src.operations import storages as _operation_storages
from src.operations import databases as _operation_databases
from src.environments import env
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.types import Image, StorageKind, DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus
from src.database.session import session_scope
from src.database.services import compute as compute_service
from src.database.services import storage as storage_service
from src.database.services import database as database_service
from src.database.services import operations
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.models.operations import OperationKind, ReconciliationScope
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.models.infrastructure import exoscale_zone
from src.database.models.association import UserOrganization

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_NAME = "Example LongLink"
LOCAL_ADMIN_EMAIL = "example@longlink.dev"
LOCAL_ADMIN_PASSWORD = "longlink-admin"
LOCAL_DATABASE_PORT = 15432
LOCAL_DOCKER_NETWORK = "longlink-dev"
LOCAL_APPLICATION_IMAGE = "localhost:15000/longlink-app:dev"
LOCAL_APP_NAME = "sample"
KUBECONFIG = Path(__file__).with_name("kubeconfig.yaml")


class SeedSettings(BaseSettings):
    """Define credentials required only while seeding local development."""

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


def local_database_host() -> str:
    """Return the local Docker host address reachable from k3d application pods."""

    # Resolve the current network gateway because Docker can change it after recreation.
    result = subprocess.run(
        ["docker", "network", "inspect", LOCAL_DOCKER_NETWORK, "--format", "{{range .IPAM.Config}}{{.Gateway}}{{end}}"],
        capture_output=True,
        check=True,
        text=True,
    )
    host = result.stdout.strip()
    if not host:
        raise RuntimeError(f"Docker network '{LOCAL_DOCKER_NETWORK}' has no gateway address")
    return host


async def seed_local_administrator() -> tuple[User, bool]:
    """Create or repair the local administrator and report shared user changes."""

    async with session_scope() as session:
        result = await session.execute(select(User).where(col(User.email) == LOCAL_ADMIN_EMAIL))
        user = result.scalar_one_or_none()

        # Create the local account or repair its development credentials and role.
        if user is None:
            user = User(
                name=LOCAL_ADMIN_NAME,
                email=LOCAL_ADMIN_EMAIL,
                hashed_password=passwords.hash(LOCAL_ADMIN_PASSWORD),
                role=PlatformRoles.administrator,
            )
            session.add(user)
            user_changed = True
        else:
            verified, updated_hash = passwords.verify(LOCAL_ADMIN_PASSWORD, user.hashed_password)
            user_changed = (
                not verified
                or updated_hash is not None
                or user.name != LOCAL_ADMIN_NAME
                or user.role != PlatformRoles.administrator
                or user.deleted_at is not None
            )
            user.name = LOCAL_ADMIN_NAME
            if not verified:
                user.hashed_password = passwords.hash(LOCAL_ADMIN_PASSWORD)
            elif updated_hash is not None:
                user.hashed_password = updated_hash
            user.role = PlatformRoles.administrator
            user.deleted_at = None

        await session.commit()
        return user, user_changed


async def ensure_local_organization_owner(organization_id: UUID, user_id: UUID) -> bool:
    """Grant local administrator ownership and report whether shared Organization state changed."""

    # Local reseeding repairs only Platform membership metadata.
    async with session_scope() as session:
        membership = await session.get(UserOrganization, {"organization_id": organization_id, "user_id": user_id})
        now = utcnow()
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
            membership.updated_at = now
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
        if result.stopped_at is not None:
            if result.failed:
                raise RuntimeError(f"Operation {result.id} failed; see the Platform logs")
            return
        await asyncio.sleep(1)


async def seed_local_development(settings: SeedSettings) -> None:
    """Create or repair local infrastructure, Organization, and sample Application desired state."""

    # Load the Exoscale identity used to bootstrap the local storage registry.
    access_key_id = settings.EXOSCALE_API_KEY
    secret_access_key = settings.EXOSCALE_API_SECRET
    storage_endpoint_url = settings.EXOSCALE_STORAGE_ENDPOINT_URL

    admin, administrator_changed = await seed_local_administrator()
    compute_registry = next((item for item in await compute_service.fetch() if item.slug == "local-compute"), None)
    compute_ready = compute_registry is not None and compute_registry.status == ComputeStatus.ready

    # Reconcile the local compute target before assigning Organizations to it.
    if compute_registry is None:
        compute_registry, operation = await compute_service.create(
            "local compute",
            "local-compute",
            KUBECONFIG.read_text(encoding="utf-8"),
            admin,
        )
        await reconcile_until_complete(operation.id)
        compute_ready = True

    # Register the local database and storage backends independently.
    database_registry = next((item for item in await database_service.fetch() if item.slug == "local-database"), None)
    if database_registry is None:
        database_registry = await database_service.create(
            "local database",
            "local-database",
            local_database_host(),
            LOCAL_DATABASE_PORT,
            "admin",
            "admin",
            DatabaseSSLMode.disable,
            admin,
        )
    storage_registry = next((item for item in await storage_service.fetch() if item.slug == "local-storage"), None)
    if storage_registry is None:
        storage_registry = await storage_service.create(
            "local storage",
            "local-storage",
            StorageKind.exoscale,
            storage_endpoint_url,
            None,
            access_key_id,
            secret_access_key,
            admin,
        )
    elif (
        storage_registry.endpoint_url != storage_endpoint_url
        or storage_registry.access_key_id != access_key_id
        or storage_registry.secret_access_key != secret_access_key
    ):
        raise ValueError("Local storage registry uses different Exoscale settings; run make down before changing them")

    organization = next((item for item in await organization_service.fetch() if item.slug == LOCAL_ORG), None)
    if organization is None:
        # Repair an existing compute before a new Organization requires its ready state.
        if not compute_ready:
            operation = await operations.enqueue(compute_registry.id, ReconciliationScope.platform)
            await reconcile_until_complete(operation.id)
            compute_ready = True
        organization, operation = await organization_service.create(
            LOCAL_ORG,
            LOCAL_ORG,
            compute_registry.id,
            database_registry.id,
            storage_registry.id,
            admin,
            avatar=LOCAL_ORG_AVATAR,
        )
        await reconcile_until_complete(operation.id)
    else:
        owner_changed = await ensure_local_organization_owner(organization.id, admin.id)
        if administrator_changed or owner_changed:
            operation = await operations.enqueue(
                compute_registry.id,
                ReconciliationScope.platform,
                kind=OperationKind.database,
                target_id=organization.id,
            )
            await reconcile_until_complete(operation.id)

    # The sample application follows the same desired-state service used by the API route.
    payload = ApplicationCreate(
        name=LOCAL_APP_NAME,
        image=Image(LOCAL_APPLICATION_IMAGE),
        description="Local SDK development application",
        envs={"REQUIRED": "local-development"},
    )
    application = next((item for item in await organization_service.applications(organization.id) if item.slug == LOCAL_APP_NAME), None)
    if application is None:
        # Repair an existing compute before Application creation checks its ready state.
        if not compute_ready:
            operation = await operations.enqueue(compute_registry.id, ReconciliationScope.platform)
            await reconcile_until_complete(operation.id)
        _, operation = await application_service.create(
            organization.id,
            payload.name,
            names.slugify(payload.name),
            payload.image,
            admin,
            description=payload.description,
            icon=payload.icon.value if payload.icon is not None else None,
            envs=payload.envs,
        )
        await reconcile_until_complete(operation.id)


async def cleanup_local_development() -> None:
    """Delete Exoscale resources tracked by local Platform state."""

    # Avoid creating a new SQLite database when local development has no persisted state.
    database_url = make_url(env.DATABASE_URL)
    database_name = database_url.database
    if database_url.get_backend_name() == "sqlite" and database_name is not None and database_name not in {"", ":memory:"}:
        database_path = Path(database_name)
        if not database_path.is_absolute():
            database_path = Path.cwd() / database_path
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
                WHERE storage_registries.kind = :kind
                """
            ),
            {"kind": StorageKind.exoscale.value},
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
        await storage.delete(names.organization_bucket(organization_id))

    print(f"Removed Exoscale resources for {len(resources)} development Organizations.")


def main() -> None:
    """Seed or clean local development resources from a synchronous entrypoint."""

    # Cleanup removes remote resources before make deletes their local inventory.
    parser = argparse.ArgumentParser()
    parser.add_argument("--cleanup", action="store_true")
    arguments = parser.parse_args()
    if arguments.cleanup:
        asyncio.run(cleanup_local_development())
    else:
        asyncio.run(seed_local_development(SeedSettings(**{})))
        print(f"Local administrator: {LOCAL_ADMIN_EMAIL} / {LOCAL_ADMIN_PASSWORD}")


if __name__ == "__main__":
    main()

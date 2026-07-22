import asyncio
import argparse
import subprocess
from src import adapters
from uuid import UUID
from pathlib import Path
from sqlmodel import col
from src.utils import jobs, names
from sqlalchemy import text, select, inspect
from src.operations import computes as operation_computes
from src.environments import env
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.types import Image, StorageKind, DatabaseSSLMode
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
from fastapi_users.password import PasswordHelper
from src.models.applications import ApplicationCreate
from src.database.models.users import User
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


async def seed_local_administrator() -> User:
    """Create or update the fixed local administrator account."""

    async with session_scope() as session:
        result = await session.execute(select(User).where(col(User.email) == LOCAL_ADMIN_EMAIL))
        user = result.scalar_one_or_none()
        password = PasswordHelper().hash(LOCAL_ADMIN_PASSWORD)

        # Create the local account or repair its development credentials and role.
        if user is None:
            user = User(
                name=LOCAL_ADMIN_NAME,
                email=LOCAL_ADMIN_EMAIL,
                hashed_password=password,
                is_active=True,
                is_superuser=True,
                is_verified=True,
                role=PlatformRoles.administrator,
            )
            session.add(user)
        else:
            user.name = LOCAL_ADMIN_NAME
            user.hashed_password = password
            user.is_verified = True
            user.is_active = True
            user.is_superuser = True
            user.role = PlatformRoles.administrator
            user.deleted_at = None

        await session.commit()
        await session.refresh(user)
        return user


async def ensure_local_organization_owner(organization_id: UUID, user_id: UUID) -> None:
    """Grant the local administrator owner access to a reused organization."""

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
            membership.role = OrganizationRoles.owner
            membership.deleted_at = None
            membership.deleted_id = None
            membership.updated_at = now
            membership.updated_id = user_id
        await session.commit()


async def reconcile_until_complete(compute_id: UUID) -> None:
    """Drain the durable queue until the target compute reconciliation succeeds or fails."""

    # The seed process has no lifespan worker, so it drains the same durable queue explicitly.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue
        result = await jobs.run_claimed_operation(operation, operation_computes.reconcile)
        if result.compute_id != compute_id:
            continue
        if result.stopped_at is not None:
            if result.error is not None:
                raise RuntimeError(result.error)
            return
        await asyncio.sleep(1)


async def seed_local_development() -> None:
    """Create or repair local infrastructure, Organization, and sample Application desired state."""

    # Validate the complete Exoscale development target before creating any local desired state.
    env.exoscale()
    storage_endpoint_url = env.exoscale_storage_endpoint()

    admin = await seed_local_administrator()
    compute_registry = next((item for item in await compute_service.fetch() if item.slug == "local-compute"), None)
    compute_ready = compute_registry is not None and compute_registry.status == ComputeStatus.ready

    # Reconcile the local compute target before assigning Organizations to it.
    if compute_registry is None:
        compute_registry, _ = await compute_service.create(
            "local compute",
            "local-compute",
            KUBECONFIG.read_text(encoding="utf-8"),
            admin,
        )
        await reconcile_until_complete(compute_registry.id)
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
            admin,
        )
    elif storage_registry.endpoint_url != storage_endpoint_url:
        raise ValueError("Local storage registry uses a different Exoscale endpoint; run make down before changing zones")

    organization = next((item for item in await organization_service.fetch() if item.slug == LOCAL_ORG), None)
    if organization is None:
        # Repair an existing compute before a new Organization requires its ready state.
        if not compute_ready:
            await operations.enqueue(compute_registry.id)
            await reconcile_until_complete(compute_registry.id)
            compute_ready = True
        organization = await organization_service.create(
            LOCAL_ORG,
            LOCAL_ORG,
            compute_registry.id,
            database_registry.id,
            storage_registry.id,
            admin,
            avatar=LOCAL_ORG_AVATAR,
            country="CH",
        )
        await reconcile_until_complete(compute_registry.id)
    else:
        await ensure_local_organization_owner(organization.id, admin.id)

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
            await operations.enqueue(compute_registry.id)
            await reconcile_until_complete(compute_registry.id)
        await application_service.create(
            organization.id,
            payload.name,
            names.slugify(payload.name),
            payload.image,
            admin,
            description=payload.description,
            icon=payload.icon.value if payload.icon is not None else None,
            envs=payload.envs,
        )
    else:
        # Resolve the rebuilt local tag again instead of retaining a prior immutable digest.
        application = await application_service.update_runtime(
            application.id,
            image=payload.image,
            user=admin,
            description=payload.description,
            icon=payload.icon.value if payload.icon is not None else None,
            envs=payload.envs,
        )
        if application is None:
            raise RuntimeError("Local sample Application no longer exists")
        await operations.enqueue(compute_registry.id)
    await reconcile_until_complete(compute_registry.id)


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
                SELECT storage_registries.endpoint_url, organizations.id, applications.id
                FROM organizations
                JOIN storage_registries ON storage_registries.id = organizations.storage_id
                LEFT JOIN applications ON applications.organization_id = organizations.id
                WHERE storage_registries.kind = :kind
                """
            ),
            {"kind": StorageKind.exoscale.value},
        )
        resources: dict[tuple[str, UUID], set[UUID]] = {}
        for endpoint_url, organization_id, application_id in result:
            key = (str(endpoint_url), UUID(str(organization_id)))
            applications = resources.setdefault(key, set())
            if application_id is not None:
                applications.add(UUID(str(application_id)))

    if not resources:
        print("No Exoscale development resources require cleanup.")
        return

    # Remove scoped credentials before emptying and deleting each Organization bucket.
    access_key_id, secret_access_key, exoscale_organization_id = env.exoscale()
    for (endpoint_url, organization_id), application_ids in resources.items():
        storage = adapters.Exoscale(endpoint_url, access_key_id, secret_access_key, exoscale_organization_id)
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
        asyncio.run(seed_local_development())
        print(f"Local administrator: {LOCAL_ADMIN_EMAIL} / {LOCAL_ADMIN_PASSWORD}")


if __name__ == "__main__":
    main()

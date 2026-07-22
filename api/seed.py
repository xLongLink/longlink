import asyncio
import argparse
import subprocess
from pathlib import Path
from sqlmodel import col
from src.utils import jobs, names
from sqlalchemy import text, select, inspect
from src.operations import computes as operation_computes
from src.environments import env
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.types import Image, StorageKind, DatabaseSSLMode
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
LOCAL_DOCKER_NETWORK = "k3d-compute"
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


async def ensure_local_organization_owner(organization_id, user_id) -> None:
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


async def reconcile_until_complete(compute_id) -> None:
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
            env.exoscale_storage_endpoint(),
            None,
            admin,
        )

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
    """Delete seeded provider resources before local Platform state is removed."""

    # Older local databases used disposable local storage and require no remote cleanup.
    async with session_scope() as session:
        connection = await session.connection()
        tables = await connection.run_sync(lambda sync_connection: inspect(sync_connection).get_table_names())
        if "storage_registries" not in tables:
            return
        result = await session.execute(
            text("SELECT kind FROM storage_registries WHERE slug = :slug"),
            {"slug": "local-storage"},
        )
        storage_kind = result.scalar_one_or_none()
    if storage_kind != StorageKind.exoscale.value:
        print("No Exoscale development resources require cleanup.")
        return

    # Locate the seeded compute aggregate, including cleanup already in progress.
    compute_registry = next(
        (item for item in await compute_service.fetch(include_deleted=True) if item.slug == "local-compute"),
        None,
    )
    if compute_registry is None:
        return
    organization = next(
        (item for item in await organization_service.for_compute(compute_registry.id, include_deleted=True) if item.slug == LOCAL_ORG),
        None,
    )
    if organization is None:
        return

    # Tombstone active seeded state or resume its queued cleanup before deleting the local database.
    if organization.deleted_at is None:
        async with session_scope() as session:
            result = await session.execute(select(User).where(col(User.email) == LOCAL_ADMIN_EMAIL))
            admin = result.scalar_one_or_none()
        if admin is None:
            raise RuntimeError("Local administrator is missing; Exoscale resources were not removed")
        await organization_service.soft_delete(organization.id, admin)
    else:
        await operations.enqueue(compute_registry.id)
    await reconcile_until_complete(compute_registry.id)
    print("Exoscale development bucket and Application credentials removed.")


def main() -> None:
    """Seed or clean local development resources from a synchronous entrypoint."""

    # Cleanup runs through reconciliation so remote resources disappear before local state.
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

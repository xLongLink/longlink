import asyncio
import subprocess
from pathlib import Path
from src.utils import jobs, names
from src.operations import locations as operation_locations
from src.models.roles import PlatformRoles, OrganizationRoles
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.models.locations import LocationCreate
from src.database.services import users
from src.database.services import locations as location_service
from src.database.services import operations
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.models.infrastructure import StorageKind, DatabaseKind, ComputeConfiguration, StorageConfiguration, DatabaseConfiguration
from src.database.models.association import UserOrganization

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_OIDC = "00000000-0000-0000-0000-000000000001"
LOCAL_ADMIN_NAME = "Example LongLink"
LOCAL_ADMIN_EMAIL = "example@longlink.dev"
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

    return await users.upsert(
        oidc=LOCAL_ADMIN_OIDC,
        email=LOCAL_ADMIN_EMAIL,
        name=LOCAL_ADMIN_NAME,
        role=PlatformRoles.administrator,
    )


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


async def reconcile_until_complete(location_id) -> None:
    """Execute queued local work until one location reconciliation completes."""

    # The seed process has no lifespan worker, so it drains the same durable queue explicitly.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue
        result = await jobs.run_claimed_operation(operation, operation_locations.reconcile)
        if result.location_id != location_id:
            continue
        if result.stopped_at is not None:
            if result.error is not None:
                raise RuntimeError(result.error)
            return
        await asyncio.sleep(1)


async def seed_local_development() -> None:
    """Seed a complete local location and its sample tenant desired state."""

    admin = await seed_local_administrator()
    location = next((item for item in await location_service.fetch() if item.slug == "local"), None)

    # A clean MVP database creates the complete immutable infrastructure aggregate at once.
    if location is None:
        payload = LocationCreate(
            name="local",
            country="CH",
            compute=ComputeConfiguration(kubeconfig=KUBECONFIG.read_text(encoding="utf-8")),
            database=DatabaseConfiguration(
                kind=DatabaseKind.postgresql,
                host=local_database_host(),
                port=LOCAL_DATABASE_PORT,
                username="admin",
                password="admin",
            ),
            storage=StorageConfiguration(
                kind=StorageKind.minio,
                endpoint_url="http://localhost:19000",
                runtime_endpoint_url="http://host.k3d.internal:19000",
                access_key_id="admin",
                secret_access_key="adminadmin",
            ),
        )
        location, _ = await location_service.create(names.slugify(payload.name), payload, admin)
        await reconcile_until_complete(location.id)

    organization = next((item for item in await organization_service.fetch() if item.slug == LOCAL_ORG), None)
    if organization is None:
        organization = await organization_service.create(
            LOCAL_ORG,
            LOCAL_ORG,
            location.id,
            admin,
            avatar=LOCAL_ORG_AVATAR,
            country="CH",
        )
        await reconcile_until_complete(location.id)
    else:
        await ensure_local_organization_owner(organization.id, admin.id)

    # The sample application follows the same desired-state service used by the API route.
    application = next((item for item in await organization_service.applications(organization.id) if item.slug == LOCAL_APP_NAME), None)
    if application is None:
        payload = ApplicationCreate(
            name=LOCAL_APP_NAME,
            image=LOCAL_APPLICATION_IMAGE,
            description="Local SDK development application",
            envs={"REQUIRED": "local-development"},
        )
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
        await reconcile_until_complete(location.id)


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    asyncio.run(seed_local_development())


if __name__ == "__main__":
    main()
